import JSZip from 'jszip'
import { saveAs } from 'file-saver'

function normalizeFileName(name = '') {
  return name.replace(/\s+/g, '_')
}

function stripExtension(name = '') {
  const lastDot = name.lastIndexOf('.')
  return lastDot > 0 ? name.slice(0, lastDot) : name
}

export function handleBatchChange(file, fileList) {
  const uniqueFiles = []
  const seen = new Set()

  fileList.forEach((item) => {
    const key = item.uid || item.name
    if (!seen.has(key)) {
      seen.add(key)
      uniqueFiles.push(item)
    }
  })

  this.batchFileList = uniqueFiles
  this.batchResults = []
}

export function handleBatchRemove(file, fileList) {
  this.batchFileList = fileList.slice()
  if (!this.batchFileList.length) {
    this.batchResults = []
  }
}

export async function handleBatchGenerate() {
  if (!this.batchFileList.length || this.batchLoading) return

  this.batchLoading = true
  this.batchResults = []

  const zip = new JSZip()
  let hasSuccess = false

  try {
    for (const fileItem of this.batchFileList) {
      const rawFile = fileItem.raw || fileItem
      if (!rawFile) {
        this.batchResults.push({
          name: fileItem.name,
          status: 'error',
          message: '无法读取文件，请重新选择'
        })
        continue
      }

      try {
        const views = await this.processFile(rawFile, {
          silent: true,
          preserveMaterials: true
        })
        const normalizedName = normalizeFileName(fileItem.name)
        if (Array.isArray(views) && views.length) {
          hasSuccess = true

          const folder = zip.folder(stripExtension(normalizedName)) || zip
          views.forEach((view) => {
            folder.file(view.name, view.blob)
          })

          this.batchResults.push({
            name: fileItem.name,
            status: 'success',
            message: `生成 ${views.length} 张视图`
          })
        } else {
          this.batchResults.push({
            name: fileItem.name,
            status: 'error',
            message: '未生成任何视图'
          })
        }
      } catch (error) {
        console.error('[BatchGenerate] 单文件处理失败:', error)
        this.batchResults.push({
          name: fileItem.name,
          status: 'error',
          message: error?.message || '处理失败，请检查文件格式'
        })
      }
    }

    if (hasSuccess) {
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `batch-model-views-${Date.now()}.zip`)
      const hasFailure = this.batchResults.some(item => item.status !== 'success')
      if (hasFailure) {
        this.$message.warning('部分文件生成失败，已跳过失败项')
      } else {
        this.$message.success('批量生成完成，Zip 下载已开始')
      }
    } else {
      this.$message.warning('批量生成失败，请检查文件是否有效')
    }
  } finally {
    this.batchLoading = false
  }
}

export function clearBatchQueue() {
  this.batchFileList = []
  this.batchResults = []
  const uploader = this.getBatchUploader ? this.getBatchUploader() : null
  if (uploader && uploader.clearFiles) {
    uploader.clearFiles()
  }
}

