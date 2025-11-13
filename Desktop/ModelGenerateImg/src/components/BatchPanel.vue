<template>
  <el-card class="batch-card" shadow="hover">
    <div slot="header" class="batch-header">
      <div class="batch-title">
        <i class="el-icon-collection-tag"></i>
        <div>
          <h3>{{ i18n.title }}</h3>
          <p>{{ i18n.subtitle }}</p>
        </div>
      </div>
      <div class="batch-header-meta">
        <el-tag size="mini" type="info">
          {{ pendingText }}
        </el-tag>
      </div>
    </div>

    <div class="batch-layout">
      <div class="batch-uploader-panel">
        <el-upload
          class="batch-upload"
          drag
          action="#"
          multiple
          :auto-upload="false"
          :file-list="fileList"
          :on-change="onChange"
          :on-remove="onRemove"
          :accept="accept"
          ref="batchUploader"
        >
          <i class="el-icon-upload"></i>
          <div class="el-upload__text">
            {{ i18n.uploadTip }}
            <em>{{ i18n.uploadAction }}</em>
          </div>
          <div slot="tip" class="el-upload__tip">
            {{ i18n.uploadHint }}
          </div>
        </el-upload>

        <div class="batch-summary">
          <div class="summary-item">
            <span class="summary-title">{{ i18n.summary.success }}</span>
            <span class="summary-value success">{{ successCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-title">{{ i18n.summary.failure }}</span>
            <span class="summary-value danger">{{ failureCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-title">{{ i18n.summary.total }}</span>
            <span class="summary-value default">{{ totalCount }}</span>
          </div>
        </div>

        <div class="batch-actions">
          <el-button
            type="primary"
            :loading="loading"
            :disabled="!fileList.length"
            @click="onStart"
          >
            {{ loading ? i18n.generating : i18n.start }}
          </el-button>
          <el-button
            type="text"
            :disabled="!fileList.length || loading"
            @click="onClear"
          >
            {{ i18n.clear }}
          </el-button>
        </div>
      </div>

      <div class="batch-result-panel" v-loading="loading">
        <template v-if="results.length">
          <el-table
            :data="results"
            size="small"
            border
            class="batch-table"
          >
            <el-table-column :label="i18n.table.file" prop="name" min-width="200" />
            <el-table-column
              prop="status"
              :label="i18n.table.status"
              width="120"
            >
              <template slot-scope="scope">
                <el-tag
                  v-if="scope.row.status === 'success'"
                  type="success"
                  size="mini"
                >
                  {{ i18n.table.success }}
                </el-tag>
                <el-tag
                  v-else
                  type="danger"
                  size="mini"
                >
                  {{ i18n.table.failure }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              prop="message"
              :label="i18n.table.message"
              min-width="220"
            />
          </el-table>
        </template>
        <div v-else class="batch-empty">
          <i class="el-icon-box"></i>
          <p>{{ i18n.emptyTitle }}</p>
          <span>{{ i18n.emptySubtitle }}</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<script>
const TEXTS = {
  zh: {
    title: '批量生成',
    subtitle: '一次选择多个模型文件，自动生成并打包下载',
    pending: (count) => `共 ${count} 个待处理文件`,
    uploadTip: '将模型拖拽到此处，或',
    uploadAction: '点击选择',
    uploadHint: '支持批量选择 .fbx / .gltf / .glb 文件，建议单个文件不超过 150MB',
    summary: {
      success: '成功',
      failure: '失败',
      total: '总数'
    },
    start: '开始批量生成',
    generating: '正在生成...',
    clear: '清空任务',
    table: {
      file: '文件',
      status: '状态',
      message: '说明',
      success: '成功',
      failure: '失败'
    },
    emptyTitle: '等待执行批量任务',
    emptySubtitle: '选择模型文件后点击“开始批量生成”即可批量导出视图'
  },
  en: {
    title: 'Batch Generation',
    subtitle: 'Select multiple model files at once and export packaged views automatically',
    pending: (count) => `${count} file(s) pending`,
    uploadTip: 'Drag models here, or',
    uploadAction: 'click to select',
    uploadHint: 'Supports multiple .fbx / .gltf / .glb files. Recommended single file under 150MB.',
    summary: {
      success: 'Success',
      failure: 'Failed',
      total: 'Total'
    },
    start: 'Start Batch',
    generating: 'Generating...',
    clear: 'Clear Tasks',
    table: {
      file: 'File',
      status: 'Status',
      message: 'Message',
      success: 'Success',
      failure: 'Failed'
    },
    emptyTitle: 'Waiting for batch task',
    emptySubtitle: 'Add model files and click “Start Batch” to export views automatically'
  }
}

export default {
  name: 'BatchPanel',
  props: {
    language: {
      type: String,
      default: 'zh'
    },
    fileList: {
      type: Array,
      default: () => []
    },
    results: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    successCount: {
      type: Number,
      default: 0
    },
    failureCount: {
      type: Number,
      default: 0
    },
    totalCount: {
      type: Number,
      default: 0
    },
    onChange: {
      type: Function,
      required: true
    },
    onRemove: {
      type: Function,
      required: true
    },
    onStart: {
      type: Function,
      required: true
    },
    onClear: {
      type: Function,
      required: true
    },
    accept: {
      type: String,
      default: '.fbx,.gltf,.glb'
    }
  },
  computed: {
    i18n () {
      return TEXTS[this.language] || TEXTS.zh
    },
    pendingText () {
      const pending = this.i18n.pending
      if (typeof pending === 'function') {
        return pending(this.totalCount)
      }
      return pending.replace('{count}', this.totalCount)
    }
  },
  methods: {
    getUploader () {
      return this.$refs.batchUploader
    }
  }
}
</script>

<style scoped>
.batch-card {
  border-radius: 12px;
}

.batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.batch-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.batch-title i {
  font-size: 32px;
  color: #409eff;
}

.batch-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2d3d;
}

.batch-title p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #909399;
}

.batch-layout {
  display: grid;
  grid-template-columns: minmax(340px, 1.15fr) minmax(360px, 1.35fr);
  gap: 28px;
  align-items: stretch;
}

.batch-uploader-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.batch-upload {
  border: 1px dashed #c0c4cc;
  border-radius: 12px;
}

.batch-upload .el-upload__text em {
  color: #409eff;
  font-style: normal;
}

.batch-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  background: #f9fafc;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-title {
  font-size: 12px;
  color: #909399;
}

.summary-value {
  font-size: 20px;
  font-weight: 600;
}

.summary-value.success {
  color: #67c23a;
}

.summary-value.danger {
  color: #f56c6c;
}

.summary-value.default {
  color: #409eff;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-result-panel {
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 16px;
  background: #fbfcff;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.batch-table ::v-deep .el-table__body tr:hover > td {
  background: rgba(64, 158, 255, 0.08);
}

.batch-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 8px;
  color: #909399;
}

.batch-empty i {
  font-size: 32px;
  color: #c0c4cc;
}

.batch-empty span {
  font-size: 13px;
}

@media (max-width: 1024px) {
  .batch-layout {
    grid-template-columns: 1fr;
  }
}
</style>

