const mongoose = require('mongoose');

// getSpeciesGroup
module.exports = async function(projectId) {
  const AnnotationModel = this.db.model('AnnotationModel');

  return AnnotationModel.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
      },
    },

    {
      $group: {
        _id: '$species',
        count: { $sum: 1 },
      },
    },

    {
      $lookup: {
        from: 'Species',
        localField: '_id',
        foreignField: '_id',
        as: 'Species',
      },
    },

    {
      $project: {
        _id: '$_id',
        species: { $arrayElemAt: ['$Species.title.zh-TW', 0] },
        count: '$count',
      },
    },
  ]);
};
