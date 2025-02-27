const _ = require('lodash');
const debug = require('debug')('app:model:project:_reformatSpeciesTimeSeries');
const errors = require('../../errors');

// input.
// [
//   {
//     "month": 12,
//     "year": 2015,
//     "species": "鼬獾",
//     "speciesId": "5cd661e332a98b60839c6cb2",
//     "numberOfRecords": 178,
//     "studyArea": "羅東處",
//     "studyAreaId": "5ceb7925caaeca25bf2d55f1"
//   }
// ]

const formatMetrics = metrics =>
  _.chain(metrics)
    .groupBy(row => `${row.year}.${row.month}`)
    .reduce((result, monthlyMetrics, yearMonth) => {
      const [year, month] = yearMonth.split('.');
      const formatedMonthlyMetrics = {
        year: Number.parseInt(year, 10),
        month: Number.parseInt(month, 10),
        species: [],
      };

      const newMetrics = _.chain(monthlyMetrics)
        .reduce((_result, row) => {
          _result.species.push({
            species: row.species,
            speciesId: row.speciesId,
            numberOfRecords: row.numberOfRecords,
          });
          return _result;
        }, formatedMonthlyMetrics)
        .value();

      newMetrics.species = _.chain(newMetrics.species)
        .sortBy('numberOfRecords')
        .reverse()
        .value();

      result.push(newMetrics);

      return result;
    }, [])
    .sortBy(['year', 'month'])
    .reduce((result, value) => {
      if (result.length === 0) {
        result.push(value);
        return result;
      }

      const nextMonth = new Date();
      const lastRow = _.last(result);
      nextMonth.setUTCFullYear(lastRow.year);
      nextMonth.setUTCMonth(lastRow.month);

      while (
        nextMonth.getMonth() + 1 !== value.month &&
        nextMonth.valueOf() <= Date.now()
      ) {
        const newMetrics = {
          year: nextMonth.getUTCFullYear(),
          month: nextMonth.getUTCMonth() + 1,
          species: [],
        };
        debug('newMetrics %j', newMetrics);
        result.push(newMetrics);
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
      }

      result.push(value);
      return result;
    }, []);

module.exports = (dataSet, keyName) => {
  if (!dataSet[0]) {
    throw new errors.Http400('No dataset returned.');
  }

  let subKeyName = '';
  switch (keyName) {
    case 'project':
      subKeyName = 'studyArea';
      break;
    case 'studyArea':
      subKeyName = 'cameraLocation';
      break;
    default:
      throw new errors.Http400('bad keyName.');
  }

  const newArray = _.chain(dataSet)
    .groupBy(`${subKeyName}Id`)
    .reduce((result, value, key) => {
      result.push({
        [`${subKeyName}Id`]: key,
        [subKeyName]: _.get(value, `[0].${subKeyName}`),
        metrics: formatMetrics(value),
      });
      return result;
    }, []);

  return newArray;
};
