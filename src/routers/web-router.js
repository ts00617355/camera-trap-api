const express = require('express');
const errors = require('../models/errors');
const accountHandler = require('../handlers/account-handler');
const annotationHandler = require('../handlers/annotation-handler');
const annotationRevisionHandler = require('../handlers/annotation-revision-handler');
const calculatorHandler = require('../handlers/calculator-handler');
const callbackHandler = require('../handlers/callback-handler');
const cameraLocationHandler = require('../handlers/camera-location-handler');
const cameraLocationAbnormalityHandler = require('../handlers/camera-location-abnormality-handler');
const dataFieldHandler = require('../handlers/data-field-handler');
const fileHandler = require('../handlers/file-handler');
const issueHandler = require('../handlers/issue-handler');
const notificationHandler = require('../handlers/notification-handler');
const projectAreaHandler = require('../handlers/project-area-handler');
const projectHandler = require('../handlers/project-handler');
const speciesHandler = require('../handlers/species-handler');
const studyAreaHandler = require('../handlers/study-area-handler');
const systemHandler = require('../handlers/system-handler');
const uploadSessionHandler = require('../handlers/upload-session-handler');
const userHandler = require('../handlers/user-handler');
const locationMonthRetrievedHandler = require('../handlers/location-month-retrieved-handler');
const forestCompartmentBoundary = require('../handlers/forest-compartment-boundary-handler');
const imageSpeciesGroup = require('../handlers/image-species-group-handler');
const speciesTimeSeriesHandler = require('../handlers/species-time-series-handler');

exports.api = express.Router();
exports.callback = express.Router();

class CustomRouter {
  constructor(router) {
    this.router = router;
  }

  static promiseErrorHandler(func) {
    return function() {
      // eslint-disable-next-line prefer-rest-params
      const next = arguments[2];
      // eslint-disable-next-line prefer-rest-params
      const result = func(...arguments);

      if (result && typeof result.catch === 'function') {
        result.catch(error => {
          if (error instanceof Error) {
            // This error is errors.HttpXXX().
            next(error);
          } else {
            next(new errors.Http500(error));
          }
        });
      }
      return result;
    };
  }

  get(path, handler) {
    this.router.get(path, CustomRouter.promiseErrorHandler(handler));
  }

  post(path, handler) {
    this.router.post(path, CustomRouter.promiseErrorHandler(handler));
  }

  put(path, handler) {
    this.router.put(path, CustomRouter.promiseErrorHandler(handler));
  }

  delete(path, handler) {
    this.router.delete(path, CustomRouter.promiseErrorHandler(handler));
  }
}

// /api/v1
const apiRouter = new CustomRouter(exports.api);
apiRouter.get('/config', systemHandler.getConfig);
apiRouter.get('/me', accountHandler.getMyProfile);
apiRouter.put('/me', accountHandler.updateMyProfile);
apiRouter.get('/me/upload-sessions', uploadSessionHandler.getMyUploadSessions);
apiRouter.get(
  '/me/upload-sessions/:uploadSessionId([a-f\\d]{24})',
  uploadSessionHandler.getMyUploadSession,
);
apiRouter.post(
  '/me/upload-sessions/:uploadSessionId([a-f\\d]{24})/_overwrite',
  uploadSessionHandler.overwriteUploadSession,
);
apiRouter.post(
  '/me/upload-sessions/:uploadSessionId([a-f\\d]{24})/_cancel',
  uploadSessionHandler.cancelUploadSession,
);
apiRouter.get('/me/notifications', notificationHandler.getMyNotifications);
apiRouter.post(
  '/me/notifications/_read',
  notificationHandler.readAllMyNotifications,
);
apiRouter.post('/logout', accountHandler.logout);
apiRouter.get(
  '/system-announcements',
  notificationHandler.getSystemAnnouncements,
);
apiRouter.get('/species', speciesHandler.getSpecies);
apiRouter.get('/species/synonyms', speciesHandler.getSpeciesSynonyms);
apiRouter.get('/annotations', annotationHandler.getAnnotations);
apiRouter.get('/annotations.csv', annotationHandler.getAnnotations);
apiRouter.post('/annotations', annotationHandler.addAnnotation);
apiRouter.get(
  '/annotations/:annotationId([a-f\\d]{24})',
  annotationHandler.getAnnotation,
);
apiRouter.put(
  '/annotations/:annotationId([a-f\\d]{24})',
  annotationHandler.updateAnnotation,
);
apiRouter.delete(
  '/annotations/:annotationId([a-f\\d]{24})',
  annotationHandler.deleteAnnotation,
);
apiRouter.get(
  '/annotations/:annotationId([a-f\\d]{24})/revisions',
  annotationRevisionHandler.getAnnotationRevisions,
);
apiRouter.post(
  '/annotations/:annotationId([a-f\\d]{24})/revisions/:revisionId([a-f\\d]{24})/_rollback',
  annotationRevisionHandler.rollbackAnnotation,
);
apiRouter.post(
  '/annotations/:annotationId([a-f\\d]{24})/file',
  fileHandler.uploadAnnotationFile,
);
apiRouter.get('/project-areas', projectAreaHandler.getProjectAreas);
apiRouter.get('/projects', projectHandler.getProjects);
apiRouter.post('/projects', projectHandler.addProject);
apiRouter.get('/projects/:projectId([a-f\\d]{24})', projectHandler.getProject);
apiRouter.put(
  '/projects/:projectId([a-f\\d]{24})',
  projectHandler.updateProject,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/example.csv',
  projectHandler.getProjectExampleCsv,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/dwca',
  projectHandler.prepareProjectDarwinCoreArchive,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/dwca',
  projectHandler.getProjectDarwinCoreArchive,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/members',
  projectHandler.addProjectMember,
);
apiRouter.put(
  '/projects/:projectId([a-f\\d]{24})/members',
  projectHandler.updateProjectMembers,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/species',
  speciesHandler.getProjectSpecies,
);
apiRouter.put(
  '/projects/:projectId([a-f\\d]{24})/species',
  speciesHandler.updateProjectSpeciesList,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/study-areas',
  studyAreaHandler.getProjectStudyAreas,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/study-areas',
  studyAreaHandler.addProjectStudyArea,
);
apiRouter.put(
  '/projects/:projectId([a-f\\d]{24})/study-areas/:studyAreaId([a-f\\d]{24})',
  studyAreaHandler.updateProjectStudyArea,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/camera-locations',
  cameraLocationHandler.getProjectCameraLocations,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/study-areas/:studyAreaId([a-f\\d]{24})/camera-locations',
  cameraLocationHandler.getStudyAreaCameraLocations,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/study-areas/:studyAreaId([a-f\\d]{24})/camera-locations',
  cameraLocationHandler.addStudyAreaCameraLocation,
);
apiRouter.put(
  '/projects/:projectId([a-f\\d]{24})/camera-locations/:cameraLocationId([a-f\\d]{24})',
  cameraLocationHandler.updateCameraLocation,
);
apiRouter.delete(
  '/projects/:projectId([a-f\\d]{24})/camera-locations/:cameraLocationId([a-f\\d]{24})',
  cameraLocationHandler.deleteCameraLocation,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/camera-locations/:cameraLocationId([a-f\\d]{24})/_lock',
  cameraLocationHandler.lockCameraLocation,
);
apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/camera-locations/:cameraLocationId([a-f\\d]{24})/_unlock',
  cameraLocationHandler.unlockCameraLocation,
);
apiRouter.get(
  '/camera-locations/:cameraLocationId([a-f\\d]{24})',
  cameraLocationHandler.getCameraLocation,
);

apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/month-retrieved',
  locationMonthRetrievedHandler.locationMonthRetrieved,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/study-areas/:studyAreaId([a-f\\d]{24})/month-retrieved',
  locationMonthRetrievedHandler.retrievedByStudyArea,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/species-time-series',
  speciesTimeSeriesHandler.retrievedByStudyArea,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/study-areas/:studyAreaId([a-f\\d]{24})/species-time-series',
  speciesTimeSeriesHandler.retrievedByCameraLocation,
);
apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/camera-locations/:cameraLocationId([a-f\\d]{24})/month-retrieved',
  locationMonthRetrievedHandler.retrievedByCameraLocation,
);

apiRouter.post(
  '/projects/:projectId([a-f\\d]{24})/camera-location-abnormality',
  cameraLocationAbnormalityHandler.addCameraLocationAbnormality,
);

apiRouter.get(
  '/projects/:projectId([a-f\\d]{24})/image-species-group',
  imageSpeciesGroup.getByProjectId,
);

apiRouter.get('/users', userHandler.getUsers);
apiRouter.get('/data-fields', dataFieldHandler.getPublishedDataFields);
apiRouter.post('/data-fields', dataFieldHandler.addDataField);
apiRouter.post(
  '/data-fields/:dataFieldId([a-f\\d]{24})/_approve',
  dataFieldHandler.addDataFieldApprove,
);
apiRouter.post(
  '/data-fields/:dataFieldId([a-f\\d]{24})/_reject',
  dataFieldHandler.addDataFieldReject,
);
apiRouter.get(
  '/data-fields/:dataFieldId([a-f\\d]{24})',
  dataFieldHandler.getPublishedDataField,
);
apiRouter.post('/issues', issueHandler.addIssue);
apiRouter.get(
  '/forest-compartment-boundary',
  forestCompartmentBoundary.getForestCompartmentBoundary,
);
apiRouter.get('/calculator/ltd', calculatorHandler.calculateLTD);
apiRouter.get('/calculator/oi', calculatorHandler.calculateOI);

// multipart/form-data
apiRouter.post('/files', fileHandler.uploadFile);

// /callback
const callbackRouter = new CustomRouter(exports.callback);
callbackRouter.get('/orcid/auth', callbackHandler.orcidAuth);
