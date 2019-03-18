const { Schema } = require('mongoose');
const utils = require('../../common/utils');

const db = utils.getDatabaseConnection();
const model = db.model(
  'AnnotationRevisionModel',
  utils.generateSchema(
    {
      annotation: {
        type: Schema.ObjectId,
        ref: 'AnnotationModel',
        required: true,
        index: {
          name: 'Annotation',
        },
      },
      isCurrent: {
        // true 為「目前版本」
        type: Boolean,
        default: true,
      },
      user: {
        // 編輯人
        type: Schema.ObjectId,
        ref: 'UserModel',
        required: true,
      },
      // ----- 以下欄位為記錄 annotation 使用 -----
      site: {
        // 樣區
        type: Schema.ObjectId,
        ref: 'ProjectSiteModel',
      },
      camera: {
        // 相機
        type: Schema.ObjectId,
        ref: 'ProjectCameraModel',
      },
      filename: {
        // 檔名（顯示於資料編輯界面，內容來自 csv 匯入）
        type: String,
      },
      imageFileName: {
        // s3 filename
        type: String,
      },
      time: {
        // 時間
        type: Date,
      },
      species: {
        // 物種
        type: Schema.ObjectId,
        ref: 'ProjectSpeciesModel',
      },
      customFields: [
        // 儲存非系統預設欄位的資料
        // 將系統預設欄位儲於上層物件是為了方便搜尋
        {
          _id: false,
          dataField: {
            type: Schema.ObjectId,
            ref: 'DataFieldModel',
          },
          value: {
            time: {
              type: Date,
            },
            text: {
              type: String,
            },
            selectId: {
              type: Schema.ObjectId,
            },
          },
        },
      ],
    },
    {
      collection: 'AnnotationRevisions',
    },
  ),
);

model.prototype.dump = function() {
  return {
    id: `${this._id}`,
    user:
      this.user && typeof this.user.dump === 'function'
        ? this.user.dump()
        : this.user,
    isCurrent: this.isCurrent,
  };
};

module.exports = model;