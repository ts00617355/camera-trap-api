const auth = require('../auth/authorization');
const errors = require('../models/errors');
const PageList = require('../models/page-list');
const utils = require('../common/utils');
const UserPermission = require('../models/const/user-permission');
const ProjectModel = require('../models/data/project-model');
const ProjectSpeciesModel = require('../models/data/project-species-model');
const SpeciesModel = require('../models/data/species-model');
const SpeciesSearchForm = require('../forms/species/species-search-form');
const SpeciesForm = require('../forms/species/species-form');
const SpeciesSynonyms = require('../models/const/species-synonyms');

exports.getSpecies = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/species
   */
  const form = new SpeciesSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = SpeciesModel.where().sort('title.zh-TW');
  return SpeciesModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  }).then(speciesList => {
    res.json(
      new PageList(
        form.index,
        form.size,
        speciesList.totalDocs,
        speciesList.docs,
      ),
    );
  });
});

exports.getProjectSpecies = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/projects/:projectId/species
   */
  const form = new SpeciesSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }

  const query = ProjectSpeciesModel.where({ project: req.params.projectId })
    .sort(form.sort)
    .populate('species');
  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    ProjectSpeciesModel.paginate(query, {
      offset: form.index * form.size,
      limit: form.size,
    }),
  ]).then(([project, speciesList]) => {
    if (!project) {
      throw new errors.Http404();
    }
    if (!project.canAccessBy(req.user)) {
      throw new errors.Http403();
    }

    res.json(
      new PageList(
        form.index,
        form.size,
        speciesList.totalDocs,
        speciesList.docs,
      ),
    );
  });
});

exports.updateProjectSpeciesList = auth(UserPermission.all(), (req, res) => {
  /*
  PUT /api/v1/projects/:projectId/species
   */
  if (!Array.isArray(req.body)) {
    throw new errors.Http400();
  }
  const forms = [];
  for (let index = 0; index < req.body.length; index += 1) {
    const form = new SpeciesForm(req.body[index]);
    const errorMessage = form.validate();
    if (errorMessage) {
      throw new errors.Http400(errorMessage);
    }
    if (!form.id && !form.title) {
      throw new errors.Http400('Title is required');
    }
    forms.push(form);
  }

  const newSpeciesTitles = [];
  forms.forEach(form => {
    if (form.id) {
      return;
    }
    if (newSpeciesTitles.indexOf(form.title['zh-TW']) >= 0) {
      throw new errors.Http400(`${form.title['zh-TW']} is duplicate.`);
    }
    newSpeciesTitles.push(form.title['zh-TW']);
  });

  return Promise.all([
    ProjectModel.findById(req.params.projectId),
    ProjectSpeciesModel.where({ project: req.params.projectId })
      .populate('species')
      .sort('index'),
    SpeciesModel.where({
      'title.zh-TW': { $in: Array.from(newSpeciesTitles) },
    }),
  ])
    .then(([project, projectSpeciesList, speciesList]) => {
      if (!project) {
        throw new errors.Http404();
      }
      if (!project.canManageBy(req.user)) {
        throw new errors.Http403();
      }
      forms.forEach(form => {
        if (form.id) {
          return;
        }
        if (
          projectSpeciesList.find(
            x => x.species.title['zh-TW'] === form.title['zh-TW'],
          )
        ) {
          throw new errors.Http400(`${form.title['zh-TW']} is duplicate.`);
        }
        newSpeciesTitles.push(form.title['zh-TW']);
      });

      const tasks = [];
      projectSpeciesList.forEach(projectSpecies => {
        if (!forms.find(x => x.id === `${projectSpecies.species._id}`)) {
          // Missing the species in forms.
          // The user can't delete any exist species.

          // TESRI want to delete default species
          // TODO: use a flag in projectSpecies to hide instead of delete
          // throw new errors.Http400(`Missing ${projectSpecies.species._id}.`);
          tasks.push(projectSpecies.delete());
        }
      });
      forms.forEach((form, index) => {
        if (form.id) {
          // Update .index of exists species.
          const projectSpecies = projectSpeciesList.find(
            x => `${x.species._id}` === form.id,
          );
          if (!projectSpecies) {
            throw new errors.Http400(`Can't find species ${form.id}.`);
          }
          if (projectSpecies.index !== index) {
            projectSpecies.index = index;
            tasks.push(projectSpecies.save());
          }
        } else {
          // Create a new species.
          const species = speciesList.find(
            x => x.title['zh-TW'] === form.title['zh-TW'],
          );
          if (species) {
            // The species is exists.
            // Just add the reference with the project.
            const projectSpecies = new ProjectSpeciesModel({
              project,
              species,
              index,
            });
            tasks.push(projectSpecies.save());

            // Find annotations by the species.
            // Remove the flag `new-species` at annotation.failures.
            utils.removeNewSpeciesFailureFlag(project, species).catch(error => {
              utils.logError(error, { project, species });
            });
          } else {
            // The species is not exists.
            // Create a new species and add the reference with the project.
            const newSpecies = new SpeciesModel({ title: form.title });
            const projectSpecies = new ProjectSpeciesModel({
              project,
              species: newSpecies,
              index,
            });
            tasks.push(newSpecies.save());
            tasks.push(projectSpecies.save());
          }
        }
      });
      return Promise.all(tasks);
    })
    .then(() => exports.getProjectSpecies(req, res));
});

exports.getSpeciesSynonyms = auth(UserPermission.all(), (req, res) => {
  /*
  GET /api/v1/species/:speciesName
  DEPRICATED 
  */
  const form = new SpeciesSearchForm(req.query);
  const errorMessage = form.validate();
  if (errorMessage) {
    throw new errors.Http400(errorMessage);
  }
  const query = SpeciesModel.where().sort('title.zh-TW');

  const queryName = req.query.species || '';
  const queryProject = req.query.project || '';

  if (queryName === '') {
    throw new errors.Http400('species is required.');
  } else {
    let foundSynonyms = [];
    Object.entries(SpeciesSynonyms).find(item => {
      let synonymList = [item[0]];
      if (item[1] !== '') {
        synonymList = synonymList.concat(item[1].split(';'));
      }
      if (synonymList.indexOf(queryName) >= 0) {
        foundSynonyms = synonymList;
        return true;
      }
      return false;
    });
    query.where({ 'title.zh-TW': { $in: foundSynonyms } });
  }
  return SpeciesModel.paginate(query, {
    offset: form.index * form.size,
    limit: form.size,
  })
    .then(speciesList => {
      const speciesIds = speciesList.docs.map(x => x.id);
      const queryProjectSpecies = ProjectSpeciesModel.where({
        species: {
          $in: speciesIds,
        },
      }).populate('species');
      if (queryProject) {
        queryProjectSpecies.where({ project: queryProject });
      }
      return Promise.all([speciesList, queryProjectSpecies]);
    })
    .then(([speciesList, projectSpecies]) => {
      const relatedProjectSpecies = {};
      projectSpecies.forEach(species => {
        if (!relatedProjectSpecies[species._id]) {
          relatedProjectSpecies[species._id] = [];
        }
        relatedProjectSpecies[species._id].push(species);
      });
      res.json(relatedProjectSpecies);
    });
});
