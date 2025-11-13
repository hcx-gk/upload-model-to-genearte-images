<template>
  <div class="main-page">
    <header class="main-page__header">
      <div class="main-page__title">{{ i18nTexts.title }}</div>
      <div class="main-page__controls">
        <nav class="main-page__nav">
        <button
          type="button"
          class="main-page__nav-item"
          :class="{ 'main-page__nav-item--active': activeTab === 'single' }"
          @click="switchTab('single')"
        >
          {{ i18nTexts.single }}
        </button>
        <button
          type="button"
          class="main-page__nav-item"
          :class="{ 'main-page__nav-item--active': activeTab === 'batch' }"
          @click="switchTab('batch')"
        >
          {{ i18nTexts.batch }}
        </button>
        <button
          type="button"
          class="main-page__nav-item main-page__nav-item--studio"
          @click="goToStudio"
        >
          {{ i18nTexts.studio }}
        </button>
        </nav>
        <el-button
          type="text"
          class="main-page__lang-btn"
          icon="el-icon-translate"
          @click="toggleLanguage"
        >
          {{ language === 'zh' ? '中文' : 'English' }}
        </el-button>
      </div>
    </header>

    <div class="main-page__content">
      <section
        v-show="activeTab === 'single'"
        class="main-page__section"
      >
        <PrewviewPanel
          ref="previewPanel"
          :file-list="fileList"
          :images="images"
          :language="language"
          :background-color="backgroundColor"
          :preset-colors="presetColors"
          :loading="loading"
          :before-upload="beforeUpload"
          :http-request="handleUpload"
          :on-remove="handleRemove"
          :go-to-studio="goToStudio"
          :accept="acceptFormats"
          @update:backgroundColor="onBackgroundColorUpdate"
          @reset-background="resetBackground"
          @download="downloadZip"
        />
      </section>
      <section
        v-show="activeTab === 'batch'"
        class="main-page__section main-page__section--batch"
      >
        <BatchPanel
          ref="batchPanel"
          :file-list="batchFileList"
          :results="batchResults"
          :language="language"
          :loading="batchLoading"
          :success-count="batchSuccessCount"
          :failure-count="batchFailureCount"
          :total-count="batchTotalCount"
          :on-change="handleBatchChange"
          :on-remove="handleBatchRemove"
          :on-start="handleBatchGenerate"
          :on-clear="handleBatchClear"
          :accept="acceptFormats"
        />
      </section>
    </div>
  </div>
</template>

<script>
const BatchPanel = () => import('../components/BatchPanel.vue')
const PrewviewPanel = () => import('../components/PreviewPanel.vue')

import modelProcessing from '@/utils/modelProcessing'
import {
  handleBatchChange,
  handleBatchRemove,
  handleBatchGenerate,
  clearBatchQueue
} from '@/utils/batchHandlers'

const LANG_TEXT = {
  zh: {
    title: '模型生成工作台',
    single: '单次开发',
    batch: '批量开发',
    studio: '进入 Studio 工作室'
  },
  en: {
    title: 'Model Generation Studio',
    single: 'Single',
    batch: 'Batch',
    studio: 'Go to Studio'
  }
}

export default {
  data () {
    return {
      activeTab: 'single',
      acceptFormats: '.fbx,.gltf,.glb',
      language: 'zh',
      fileList: [],
      loading: false,
      images: [],
      renderer: null,
      scene: null,
      camera: null,
      model: null,
      pmremGenerator: null,
      environmentRT: null,
      viewDistance: 10,
      backgroundColor: '#bfbfbf',
      presetColors: [
        '#ffffff',
        '#f0f0f0',
        '#bfbfbf',
        '#808080',
        '#000000',
        '#fbeadc',
        '#d6f5ff',
        '#e6f7f2',
        '#ffe6f0'
      ],
      silentMode: false,
      batchFileList: [],
      batchResults: [],
      batchLoading: false
    }
  },
  components: {
    BatchPanel,
    PrewviewPanel
  },
  mounted () {
    this.$nextTick(() => {
      this.initThree()
      window.addEventListener('resize', this.handleResize)
    })
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.handleResize)
    this.disposeScene()
  },
  computed: {
    batchSuccessCount () {
      return this.batchResults.filter(item => item.status === 'success').length
    },
    batchFailureCount () {
      return this.batchResults.filter(item => item.status && item.status !== 'success').length
    },
    batchTotalCount () {
      return this.batchFileList.length
    },
    i18nTexts () {
      return LANG_TEXT[this.language] || LANG_TEXT.zh
    }
  },
  watch: {
    backgroundColor () {
      this.applyBackgroundColor()
    }
  },
  methods: {
    goToStudio () {
      this.$router.push('/studio')
    },
    switchTab (tab) {
      if (tab === 'single' || tab === 'batch') {
        this.activeTab = tab
      }
    },
    ...modelProcessing,
    handleRemove () {
      this.resetState()
      this.renderScene()
    },
    getPreviewCanvas () {
      const previewRef = this.$refs.previewPanel
      return previewRef && typeof previewRef.getCanvasElement === 'function'
        ? previewRef.getCanvasElement()
        : null
    },
    getBatchUploader () {
      const batchRef = this.$refs.batchPanel
      return batchRef && typeof batchRef.getUploader === 'function'
        ? batchRef.getUploader()
        : null
    },
    onBackgroundColorUpdate (value) {
      this.backgroundColor = value
    },
    handleBatchClear () {
      this.clearBatchQueue()
    },
    toggleLanguage () {
      this.language = this.language === 'zh' ? 'en' : 'zh'
    },
    handleBatchChange,
    handleBatchRemove,
    handleBatchGenerate,
    clearBatchQueue
  }
}
</script>

<style scoped>
.main-page {
  min-height: 100vh;
  padding: 120px 24px 32px;
  background: #f5f6fa;
  box-sizing: border-box;
}

.main-page__header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  z-index: 10;
}

.main-page__title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.main-page__controls {
  display: flex;
  align-items: center;
  gap: 28px;
  justify-content: flex-end;
  flex: 1;
}

.main-page__nav {
  display: flex;
  gap: 32px;
  align-items: center;
  justify-content: flex-end;
}

.main-page__nav-item {
  min-width: 108px;
  padding: 10px 18px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #4b5563;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.main-page__nav-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
}

.main-page__nav-item--active {
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
  color: #ffffff;
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.18);
}

.main-page__nav-item--studio {
  margin-right: 0;
  border: 1px solid rgba(37, 99, 235, 0.4);
  color: #2563eb;
}

.main-page__lang-btn {
  margin-right: 50px;
  padding: 6px 14px;
  font-size: 14px;
  color: #2563eb;
}

.main-page__lang-btn:hover {
  color: #1d4ed8;
}

.main-page__nav-item--studio:hover {
  background: rgba(37, 99, 235, 0.1);
}

.main-page__content {
  display: flex;
  justify-content: center;
}

.main-page__section {
  width: 100%;
  max-width: 1180px;
  background: linear-gradient(135deg, #ffffff 0%, #f9fbff 100%);
  border-radius: 24px;
  padding: 32px 36px;
  box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
  box-sizing: border-box;
}

.main-page__section--batch {
  max-width: 900px;
}

@media (max-width: 1200px) {
  .main-page {
    padding: 110px 16px 24px;
  }

  .main-page__header {
    padding: 18px 20px;
  }

  .main-page__section {
    padding: 28px;
    border-radius: 18px;
  }
}

@media (max-width: 960px) {
  .main-page__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .main-page__nav {
    width: 100%;
    flex-wrap: wrap;
  }

  .main-page__nav-item {
    flex: 1 1 30%;
    text-align: center;
  }

  .main-page__content {
    flex-direction: column;
    align-items: stretch;
  }

  .main-page__section {
    max-width: none;
    padding: 24px;
    border-radius: 16px;
  }
}
</style>
