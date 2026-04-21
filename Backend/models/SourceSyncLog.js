const mongoose = require('mongoose');

const sourceSyncLogSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['amazon', 'flipkart'],
    required: true,
    index: true
  },
  syncType: {
    type: String,
    enum: ['manual-import', 'full-feed', 'delta-feed', 'price-refresh', 'offer-sync'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['running', 'success', 'failed', 'partial'],
    default: 'running',
    index: true
  },
  startedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  finishedAt: Date,
  durationMs: Number,
  requestedCount: { type: Number, default: 0 },
  insertedCount: { type: Number, default: 0 },
  updatedCount: { type: Number, default: 0 },
  skippedCount: { type: Number, default: 0 },
  failedCount: { type: Number, default: 0 },
  lastCursor: String,
  nextCursor: String,
  pageToken: String,
  category: String,
  errorMessage: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

sourceSyncLogSchema.index({ source: 1, syncType: 1, startedAt: -1 });
sourceSyncLogSchema.index({ source: 1, status: 1, startedAt: -1 });

sourceSyncLogSchema.methods.finish = function(status, updates = {}) {
  this.status = status;
  Object.assign(this, updates);
  this.finishedAt = new Date();
  this.durationMs = this.finishedAt.getTime() - this.startedAt.getTime();
  return this.save();
};

module.exports = mongoose.model('SourceSyncLog', sourceSyncLogSchema, 'source_sync_logs');
