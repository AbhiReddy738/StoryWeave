import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import StoryReader from '../../components/storyreader/StoryReader';
import './PostPage.css';

const API = 'https://storyweave-fxdt.onrender.com/api/story';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Adventure', 'Historical Fiction', 'Literary Fiction',
  'Young Adult', 'Children', 'Comedy', 'Drama', 'Poetry', 'Other'
];

// Helper: compute word count from blocks
const getWordCount = (blocks) => {
  const text = blocks
    .filter(b => b.type === 'text')
    .map(b => b.value || '')
    .join(' ')
    .replace(/<[^>]*>/g, ' '); // strip any HTML tags from contentEditable
  const words = text.trim().split(/\s+/).filter(Boolean);
  return { words: words.length, chars: text.replace(/\s/g, '').length };
};

const PostPage = ({ collapsed }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  // ── Core story fields ──────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [authorNote, setAuthorNote] = useState('');
  const [genre, setGenre] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [status, setStatus] = useState('draft');
  const [storyType, setStoryType] = useState('single');
  const [author, setAuthor] = useState('');
  const [authorId, setAuthorId] = useState(null);

  // ── Cover image ────────────────────────────────────────────────────────────
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const coverInputRef = useRef(null);

  // ── Block-based content editor ────────────────────────────────────────────
  // Each block: { id, type: 'text'|'image', value: string }
  const [blocks, setBlocks] = useState([
    { id: Date.now(), type: 'text', value: '' }
  ]);
  const [uploadingBlockId, setUploadingBlockId] = useState(null);

  // ── Auto-save state ────────────────────────────────────────────────────────
  const [storyId, setStoryId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveLabel, setSaveLabel] = useState('');
  const autoSaveRef = useRef(null);
  const lastSavedRef = useRef(null);

  // ── Live stats ─────────────────────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // ── Preview ────────────────────────────────────────────────────────────────
  const [showPreview, setShowPreview] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState('success');

  const showFeedback = (msg, type = 'success') => {
    setFeedback(msg);
    setFeedbackType(type);
    setTimeout(() => {
      setFeedback('');
    }, 4000);
  };

  // Load logged-in user on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      setAuthor(parsed.username || '');
      setAuthorId(parsed._id || null);
    }
  }, []);

  // Live word/char count whenever blocks change
  useEffect(() => {
    const { words, chars } = getWordCount(blocks);
    setWordCount(words);
    setCharCount(chars);
  }, [blocks]);

  // "Saved X seconds ago" label ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      if (lastSavedRef.current) {
        const secs = Math.floor((Date.now() - lastSavedRef.current) / 1000);
        setSaveLabel(`Saved ${secs}s ago`);
      }
    }, 5000);
    return () => clearInterval(ticker);
  }, []);

  // ── Build payload ──────────────────────────────────────────────────────────
  const buildPayload = useCallback((overrideStatus) => {
    const textContent = blocks
      .filter(b => b.type === 'text')
      .map(b => b.value.replace(/<[^>]*>/g, ' '))
      .join(' ');
    const wordCountVal = textContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCountVal / 200));

    return {
      title: title || 'Untitled',
      summary,
      genre,
      content: blocks,
      author,
      authorId,
      coverImage: coverImageUrl,
      tags,
      authorNote,
      readingTime,
      status: overrideStatus !== undefined ? overrideStatus : status,
      storyType,
      likes: 0
    };
  }, [title, summary, genre, blocks, author, authorId, coverImageUrl, tags, authorNote, status, storyType]);

  // ── Auto-save (every 30 seconds) ──────────────────────────────────────────
  const doAutoSave = useCallback(async () => {
    if (!title && blocks.every(b => !b.value)) return; // nothing to save
    setSaving(true);
    try {
      const payload = buildPayload('draft');
      if (storyId) {
        await axios.put(`${API}/update/${storyId}`, payload);
      } else {
        const res = await axios.post(`${API}/create`, payload);
        setStoryId(res.data.story._id);
      }
      lastSavedRef.current = Date.now();
      setLastSaved(Date.now());
      setSaveLabel('Saved just now');
    } catch (err) {
      console.error('Auto-save failed', err);
    } finally {
      setSaving(false);
    }
  }, [buildPayload, storyId, title, blocks]);

  useEffect(() => {
    autoSaveRef.current = setInterval(doAutoSave, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [doAutoSave]);

  // ── Cover image upload ─────────────────────────────────────────────────────
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post(`${API}/upload-cover`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setCoverImageUrl(res.data.url);
    } catch (err) {
      showFeedback('Cover image upload failed. Check Cloudinary credentials.', 'error');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // ── Block management ───────────────────────────────────────────────────────
  const updateBlock = (id, value) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, value } : b));
  };

  const addTextBlock = (afterIndex) => {
    const newBlock = { id: Date.now(), type: 'text', value: '' };
    setBlocks(prev => {
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, newBlock);
      return copy;
    });
  };

  const removeBlock = (id) => {
    setBlocks(prev => {
      if (prev.length === 1) return prev; // always keep at least one
      return prev.filter(b => b.id !== id);
    });
  };

  const handleInlineImageUpload = async (afterIndex, file) => {
    if (!file) return;
    const tempId = Date.now();
    setUploadingBlockId(tempId);
    // Insert placeholder immediately
    const placeholderBlock = { id: tempId, type: 'image', value: '', uploading: true };
    setBlocks(prev => {
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, placeholderBlock);
      return copy;
    });

    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await axios.post(`${API}/upload-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBlocks(prev => prev.map(b =>
        b.id === tempId ? { ...b, value: res.data.url, uploading: false } : b
      ));
    } catch (err) {
      setBlocks(prev => prev.filter(b => b.id !== tempId));
      showFeedback('Image upload failed.', 'error');
    } finally {
      setUploadingBlockId(null);
    }
  };

  // ── Tags ───────────────────────────────────────────────────────────────────
  const handleTagKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase().replace(/,/g, '');
      if (!tags.includes(newTag) && tags.length < 10) {
        setTags(prev => [...prev, newTag]);
      }
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  // ── Toolbar (contentEditable execCommand) ──────────────────────────────────
  const execFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  // ── Save Draft ─────────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    if (!title) { showFeedback('Please add a title before saving', 'error'); return; }
    setSaving(true);
    try {
      const payload = buildPayload('draft');
      if (storyId) {
        await axios.put(`${API}/update/${storyId}`, payload);
      } else {
        const res = await axios.post(`${API}/create`, payload);
        setStoryId(res.data.story._id);
      }
      lastSavedRef.current = Date.now();
      setLastSaved(Date.now());
      setSaveLabel('Draft saved!');
      showFeedback('Draft saved successfully!', 'success');
    } catch (err) {
      showFeedback('Failed to save draft', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Publish ────────────────────────────────────────────────────────────────
  const handlePublish = async () => {
    if (!title || !genre || !author) {
      showFeedback('Title, Genre, and Author are required to publish.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const payload = buildPayload('published');
      if (storyId) {
        await axios.put(`${API}/update/${storyId}`, payload);
      } else {
        const res = await axios.post(`${API}/create`, payload);
        setStoryId(res.data.story._id);
      }
      showFeedback('Story published successfully! 🎉', 'success');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      showFeedback('Failed to publish story.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // ── Preview data ───────────────────────────────────────────────────────────
  const previewStory = {
    _id: storyId || 'preview',
    title: title || 'Untitled Story',
    author,
    genre,
    summary,
    content: blocks,
    coverImage: coverImageUrl,
    tags,
    authorNote,
    createdAt: new Date().toISOString()
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="post-page">
      {showPreview && (
        <StoryReader story={previewStory} onClose={() => setShowPreview(false)} />
      )}

      <div className={`post-container ${collapsed ? 'post-expanded' : ''}`}>

        {/* Inline Feedback Banner */}
        {feedback && (
          <div className={`editor-feedback-banner ${feedbackType}`}>
            {feedback}
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="post-topbar">
          <h1 className="post-heading">✍️ Story Editor</h1>
          <div className="post-topbar-actions">
            {saveLabel && <span className="save-label">{saving ? '⟳ Saving...' : `✓ ${saveLabel}`}</span>}
            <button className="btn-outline" onClick={handleSaveDraft} disabled={saving}>
              💾 Save Draft
            </button>
            <button className="btn-outline btn-preview" onClick={() => setShowPreview(true)}>
              👁 Preview
            </button>
            <button className="btn-publish" onClick={handlePublish} disabled={publishing}>
              {publishing ? 'Publishing...' : '🚀 Publish'}
            </button>
          </div>
        </div>

        <div className="editor-layout">

          {/* ══ LEFT: EDITOR AREA ══════════════════════════════════════════ */}
          <div className="editor-main">

            {/* Cover image */}
            <div
              className={`cover-upload-area ${coverImageUrl ? 'has-image' : ''}`}
              style={coverImageUrl ? { backgroundImage: `url(${coverImageUrl})` } : {}}
            >
              {!coverImageUrl ? (
                <div className="cover-placeholder" onClick={() => coverInputRef.current?.click()}>
                  {coverUploading
                    ? <span>⟳ Uploading...</span>
                    : <><span className="cover-icon">🖼️</span><span>Click to upload cover image</span></>
                  }
                </div>
              ) : (
                <div className="cover-actions">
                  <button className="cover-btn" onClick={() => coverInputRef.current?.click()}>
                    🔄 Change
                  </button>
                  <button className="cover-btn cover-btn-remove" onClick={() => setCoverImageUrl('')}>
                    🗑 Remove
                  </button>
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />
            </div>

            {/* Title */}
            <input
              className="title-input"
              type="text"
              placeholder="Story Title..."
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            {/* Summary */}
            <textarea
              className="summary-input"
              placeholder="Write a short summary to hook your readers..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={3}
            />

            {/* ── Formatting Toolbar ── */}
            <div className="writing-toolbar">
              <button className="tool-btn" title="Bold" onMouseDown={e => { e.preventDefault(); execFormat('bold'); }}>
                <strong>B</strong>
              </button>
              <button className="tool-btn" title="Italic" onMouseDown={e => { e.preventDefault(); execFormat('italic'); }}>
                <em>I</em>
              </button>
              <button className="tool-btn" title="Underline" onMouseDown={e => { e.preventDefault(); execFormat('underline'); }}>
                <u>U</u>
              </button>
              <div className="tool-divider" />
              <button className="tool-btn" title="Heading" onMouseDown={e => {
                e.preventDefault();
                execFormat('formatBlock', '<h3>');
              }}>H</button>
              <button className="tool-btn" title="Quote" onMouseDown={e => {
                e.preventDefault();
                execFormat('formatBlock', '<blockquote>');
              }}>❝</button>
              <div className="tool-divider" />
              <button className="tool-btn" title="Bullet List" onMouseDown={e => {
                e.preventDefault();
                execFormat('insertUnorderedList');
              }}>• List</button>
              <button className="tool-btn" title="Numbered List" onMouseDown={e => {
                e.preventDefault();
                execFormat('insertOrderedList');
              }}>1. List</button>
            </div>

            {/* ── Block Editor ── */}
            <div className="block-editor">
              {blocks.map((block, idx) => (
                <div key={block.id} className="block-wrapper">
                  {block.type === 'text' ? (
                    <div
                      className="text-block"
                      contentEditable
                      suppressContentEditableWarning
                      data-placeholder="Tell your story..."
                      onInput={e => updateBlock(block.id, e.currentTarget.innerHTML)}
                      dangerouslySetInnerHTML={{ __html: block.value }}
                    />
                  ) : (
                    <div className={`image-block ${block.uploading ? 'uploading' : ''}`}>
                      {block.uploading
                        ? <div className="image-block-loader">⟳ Uploading image...</div>
                        : <img src={block.value} alt={`Story image ${idx}`} />
                      }
                    </div>
                  )}

                  {/* Block controls */}
                  {blocks.length > 1 && (
                    <button
                      className="block-remove-btn"
                      onClick={() => removeBlock(block.id)}
                      title="Remove block"
                    >✕</button>
                  )}

                  {/* Add block buttons between blocks */}
                  <div className="block-add-bar">
                    <button className="block-add-btn" onClick={() => addTextBlock(idx)}>
                      + Text
                    </button>
                    <label className="block-add-btn block-add-image">
                      + Image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingBlockId !== null}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) handleInlineImageUpload(idx, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Author Note */}
            <div className="author-note-section">
              <label className="field-label">📝 Author Note <span className="optional">(optional)</span></label>
              <textarea
                className="author-note-input"
                placeholder="Share what inspired this story, a dedication, or a note to your readers..."
                value={authorNote}
                onChange={e => setAuthorNote(e.target.value)}
                rows={3}
              />
            </div>

            {/* Word / Char count */}
            <div className="word-count-bar">
              <span>📊 Words: <strong>{wordCount.toLocaleString()}</strong></span>
              <span>Characters: <strong>{charCount.toLocaleString()}</strong></span>
              <span>⏱ ~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
            </div>
          </div>

          {/* ══ RIGHT: SETTINGS PANEL ══════════════════════════════════════ */}
          <aside className="settings-panel">
            <h3 className="settings-title">⚙️ Story Settings</h3>

            {/* Genre */}
            <div className="settings-group">
              <label className="settings-label">Genre</label>
              <select
                className="settings-select"
                value={genre}
                onChange={e => setGenre(e.target.value)}
              >
                <option value="">Select genre...</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="settings-group">
              <label className="settings-label">Status</label>
              <div className="status-toggle">
                <button
                  className={`status-btn ${status === 'draft' ? 'active' : ''}`}
                  onClick={() => setStatus('draft')}
                >📄 Draft</button>
                <button
                  className={`status-btn ${status === 'published' ? 'active' : ''}`}
                  onClick={() => setStatus('published')}
                >🌐 Published</button>
              </div>
            </div>

            {/* Story Type */}
            <div className="settings-group">
              <label className="settings-label">Story Type</label>
              <div className="status-toggle">
                <button
                  className={`status-btn ${storyType === 'single' ? 'active' : ''}`}
                  onClick={() => setStoryType('single')}
                >📖 Single</button>
                <button
                  className={`status-btn ${storyType === 'chapter' ? 'active' : ''}`}
                  onClick={() => setStoryType('chapter')}
                >📚 Chapters</button>
              </div>
            </div>

            {/* Tags */}
            <div className="settings-group">
              <label className="settings-label">Tags <span className="optional">(press Enter)</span></label>
              <div className="tags-input-wrapper">
                {tags.map(tag => (
                  <span key={tag} className="tag-chip">
                    #{tag}
                    <button className="tag-remove" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>✕</button>
                  </span>
                ))}
                <input
                  className="tags-text-input"
                  placeholder={tags.length < 10 ? 'Add tag...' : 'Max 10 tags'}
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  disabled={tags.length >= 10}
                />
              </div>
            </div>

            {/* Author (read-only) */}
            <div className="settings-group">
              <label className="settings-label">Author</label>
              <div className="settings-readonly">{author || 'Not logged in'}</div>
            </div>

            {/* Quick actions (duplicate of top bar for convenience) */}
            <div className="settings-actions">
              <button className="btn-outline btn-full" onClick={handleSaveDraft} disabled={saving}>
                💾 Save Draft
              </button>
              <button className="btn-publish btn-full" onClick={handlePublish} disabled={publishing}>
                {publishing ? 'Publishing...' : '🚀 Publish Story'}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PostPage;