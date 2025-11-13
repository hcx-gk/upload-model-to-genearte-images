<template>
  <div class="preview-panel">
    <el-upload
      class="upload-area"
      drag
      action="#"
      :limit="1"
      :auto-upload="true"
      :before-upload="beforeUpload"
      :http-request="httpRequest"
      :file-list="fileList"
      :on-remove="onRemove"
      :accept="accept"
      ref="uploader"
    >
      <i class="el-icon-upload"></i>
      <div class="el-upload__text">
        {{ i18n.uploadTip }}
        <em>{{ i18n.uploadAction }}</em>
      </div>
      <div class="el-upload__tip" slot="tip">
        {{ i18n.uploadHint }}
      </div>
    </el-upload>


    <div class="controls">
      <span class="control-label">{{ i18n.background }}</span>
      <el-color-picker
        :value="backgroundColor"
        :predefine="presetColors"
        @change="onColorChange"
      />
      <el-button type="text" @click="$emit('reset-background')">{{ i18n.reset }}</el-button>
    </div>

    <div
      class="preview-wrapper"
      v-loading="loading"
      :element-loading-text="i18n.loading"
    >
      <div
        ref="previewCanvas"
        class="preview-canvas"
        :style="{ backgroundColor }"
      ></div>
      <div class="images-grid" v-if="images.length">
        <div class="image-item" v-for="item in images" :key="item.name">
          <img :src="item.url" :alt="item.name">
          <span class="image-label">{{ item.label }}</span>
        </div>
      </div>
    </div>

    <el-button
      type="primary"
      :disabled="!images.length || loading"
      @click="$emit('download')"
    >
      {{ i18n.download }}
    </el-button>
  </div>
</template>

<script>
const TEXTS = {
  zh: {
    uploadTip: '将模型拖拽到此处，或',
    uploadAction: '点击上传',
    uploadHint: '仅支持 .fbx / .gltf / .glb，文件越小处理越快',
    background: '背景颜色：',
    reset: '恢复默认',
    loading: '正在处理模型，请稍候...',
    download: '下载 Zip'
  },
  en: {
    uploadTip: 'Drag a model here, or',
    uploadAction: 'Click to upload',
    uploadHint: 'Supports .fbx / .gltf / .glb. Smaller files process faster.',
    background: 'Background color:',
    reset: 'Reset',
    loading: 'Processing model, please wait...',
    download: 'Download Zip'
  }
}

export default {
  name: 'PreviewPanel',
  props: {
    language: {
      type: String,
      default: 'zh'
    },
    fileList: {
      type: Array,
      default: () => []
    },
    images: {
      type: Array,
      default: () => []
    },
    backgroundColor: {
      type: String,
      default: '#bfbfbf'
    },
    presetColors: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    beforeUpload: {
      type: Function,
      required: true
    },
    httpRequest: {
      type: Function,
      required: true
    },
    onRemove: {
      type: Function,
      required: true
    },
    goToStudio: {
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
    }
  },
  methods: {
    onColorChange (value) {
      this.$emit('update:backgroundColor', value)
    },
    getCanvasElement () {
      return this.$refs.previewCanvas
    },
    getUploaderRef () {
      return this.$refs.uploader
    }
  }
}
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.upload-area {
  width: 100%;
}

.actions {
  display: flex;
  justify-content: flex-start;
}

.controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-label {
  font-size: 14px;
  color: #303133;
}

.preview-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-canvas {
  width: 100%;
  min-height: 360px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.image-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafafa;
}

.image-item img {
  width: 100%;
  object-fit: contain;
  background: #fff;
  border-radius: 4px;
}

.image-label {
  font-size: 14px;
  color: #000000;
}
</style>

