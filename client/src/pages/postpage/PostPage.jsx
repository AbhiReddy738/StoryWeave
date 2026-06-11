import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import LazyImage from '../../components/LazyImage';
import StoryReader from '../../components/storyreader/StoryReader';
import './PostPage.css';
import { API_BASE_URL } from '../../config';

const API = `${API_BASE_URL}/story`;

// Self-contained component to fix cursor jump and backwards typing issues (Issue 4)
const TextBlock = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);

  // Synchronize value from state to DOM innerHTML only if they differ.
  // This prevents resetting selection/caret position back to index 0 on keystrokes.
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="text-block"
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder || "Tell your story..."}
      onInput={(e) => onChange(e.currentTarget.innerHTML)}
    />
  );
};

const GENRES = [
  'Fantasy', 'Science Fiction', 'Romance', 'Mystery', 'Thriller',
  'Horror', 'Adventure', 'Historical Fiction', 'Literary Fiction',
  'Young Adult', 'Children', 'Comedy', 'Drama', 'Poetry', 'Other'
];

const SONG_GENRES = [
  'Pop', 'Rock', 'Hip-Hop', 'Rap', 'Classical', 'Lo-Fi', 'Electronic', 'Jazz', 'Indie', 'R&B'
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

const PostPage = ({ collapsed, activeGlobalTab }) => {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [contentType, setContentType] = useState(activeGlobalTab || "stories");

  // ── Core story/song fields ──────────────────────────────────────────────────────
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

  // ── Song specific fields ───────────────────────────────────────────────────
  const [lyrics, setLyrics] = useState('');
  const [artistName, setArtistName] = useState('');

  // ── Cover image ────────────────────────────────────────────────────────────
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState('');
  const coverInputRef = useRef(null);

  // ── Block-based content editor (stories only) ──────────────────────────────
  // Each block: { id, type: 'text'|'image', value: string }
  const [blocks, setBlocks] = useState([
    { id: Date.now(), type: 'text', value: '' }
  ]);
  const [uploadingBlockId, setUploadingBlockId] = useState(null);

  // ── Auto-save state (stories only) ──────────────────────────────────────────
  const [storyId, setStoryId] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [saveLabel, setSaveLabel] = useState('');
  const autoSaveRef = useRef(null);
  const lastSavedRef = useRef(null);

  // ── Live stats (stories only) ──────────────────────────────────────────────
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // ── Preview (stories only) ─────────────────────────────────────────────────
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

  // Reset page state when switching tabs
  useEffect(() => {
    setTitle('');
    setSummary('');
    setGenre('');
    setTags([]);
    setCoverImageUrl('');
    setCoverUploadError('');
    setLyrics('');
    setArtistName('');
    setBlocks([{ id: Date.now(), type: 'text', value: '' }]);
  }, [contentType]);

  // Load logged-in user on mount
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsed = JSON.parse(user);
      setAuthor(parsed.username || '');
      setAuthorId(parsed._id || null);
    }
  }, []);

  // Live word/char count whenever blocks change (stories only)
  useEffect(() => {
    if (contentType === 'songs') return;
    const { words, chars } = getWordCount(blocks);
    setWordCount(words);
    setCharCount(chars);
  }, [blocks, contentType]);

  // "Saved X seconds ago" label ticker (stories only)
  useEffect(() => {
    if (contentType === 'songs') return;
    const ticker = setInterval(() => {
      if (lastSavedRef.current) {
        const secs = Math.floor((Date.now() - lastSavedRef.current) / 1000);
        setSaveLabel(`Saved ${secs}s ago`);
      }
    }, 5000);
    return () => clearInterval(ticker);
  }, [contentType]);

  // ── Build payload (stories only) ───────────────────────────────────────────
  const buildPayload = useCallback((overrideStatus) => {
    const textContent = blocks
      .filter(b => b.type === 'text')
      .map(b => b.value.replace(/<[^>]*>/g, ' '))
      .join(' ');
    const wordCountVal = textContent.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.max(1, Math.ceil(wordCountVal / 200));

    const targetStatus = overrideStatus !== undefined ? overrideStatus : status;

    return {
      // Drafts can default to 'Untitled' so MongoDB doesn't throw a validation error.
      // Published stories send the exact title string to let backend validate properly.
      title: title.trim() || (targetStatus === 'draft' ? 'Untitled' : ''),
      summary: summary.trim(),
      genre,
      content: blocks,
      author,
      authorId,
      coverImage: coverImageUrl,
      tags,
      authorNote,
      readingTime,
      status: targetStatus,
      storyType,
      likes: 0
    };
  }, [title, summary, genre, blocks, author, authorId, coverImageUrl, tags, authorNote, status, storyType]);

  // ── Auto-save (every 30 seconds) (stories only) ────────────────────────────
  const doAutoSave = useCallback(async () => {
    if (contentType === 'songs') return;
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
  }, [buildPayload, storyId, title, blocks, contentType]);

  useEffect(() => {
    if (contentType === 'songs') return;
    autoSaveRef.current = setInterval(doAutoSave, 30000);
    return () => clearInterval(autoSaveRef.current);
  }, [doAutoSave, contentType]);

  // ── Cover image upload ─────────────────────────────────────────────────────
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCoverUploadError('');
    console.log('[DEBUG - CLIENT] Starting cover image upload for file:', file.name);

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      const errMsg = 'Invalid file type. Only JPG, JPEG, PNG, and WEBP formats are allowed.';
      setCoverUploadError(errMsg);
      showFeedback(errMsg, 'error');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    // Validate size (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const errMsg = 'File is too large. Maximum size is 5MB.';
      setCoverUploadError(errMsg);
      showFeedback(errMsg, 'error');
      if (coverInputRef.current) coverInputRef.current.value = '';
      return;
    }

    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const uploadAPI = contentType === 'songs'
        ? `${API_BASE_URL}/song/upload-cover`
        : `${API_BASE_URL}/story/upload-cover`;
      const res = await axios.post(uploadAPI, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const url = res.data.imageUrl || res.data.url;
      if (!url) {
        throw new Error('Upload succeeded but no image URL was returned.');
      }
      console.log('[DEBUG - CLIENT] Cover image uploaded successfully. URL:', url);
      setCoverImageUrl(url);
      setCoverUploadError('');
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Cover image upload failed.';
      console.error('[DEBUG - CLIENT] Cover image upload failed:', err);
      setCoverUploadError(errorMsg);
      showFeedback(errorMsg, 'error');
      setCoverImageUrl('');
    } finally {
      setCoverUploading(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  // ── Block management (stories only) ────────────────────────────────────────
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

    // Validate type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showFeedback('Invalid file type. Only JPG, JPEG, PNG, and WEBP formats are allowed.', 'error');
      return;
    }

    // Validate size (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showFeedback('File is too large. Maximum size is 5MB.', 'error');
      return;
    }

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
      const url = res.data.imageUrl || res.data.url;
      setBlocks(prev => prev.map(b =>
        b.id === tempId ? { ...b, value: url, uploading: false } : b
      ));
    } catch (err) {
      setBlocks(prev => prev.filter(b => b.id !== tempId));
      const errorMsg = err.response?.data?.message || 'Image upload failed.';
      showFeedback(errorMsg, 'error');
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

  // ── Toolbar (contentEditable execCommand) (stories only) ───────────────────
  const execFormat = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  // ── Save Draft (stories only) ──────────────────────────────────────────────
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

  // ── Publish Story (stories only) ───────────────────────────────────────────
  const handlePublish = async () => {
    // Validate title
    if (!title || !title.trim()) {
      showFeedback('Please enter title', 'error');
      return;
    }
    // Validate genre
    if (!genre) {
      showFeedback('Please enter genre', 'error');
      return;
    }
    // Validate summary
    if (!summary || !summary.trim()) {
      showFeedback('Please enter summary', 'error');
      return;
    }
    // Validate content (at least one text block with text or one image block with url)
    const hasText = blocks.some(b => b.type === 'text' && b.value && b.value.replace(/<[^>]*>/g, '').trim().length > 0);
    const hasImage = blocks.some(b => b.type === 'image' && b.value);
    if (!hasText && !hasImage) {
      showFeedback('Please enter content', 'error');
      return;
    }
    if (!author) {
      showFeedback('Author session is missing. Please log in again.', 'error');
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
      showFeedback('Story Published Successfully', 'success');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Failed to publish story.';
      showFeedback(errorMsg, 'error');
    } finally {
      setPublishing(false);
    }
  };

  // ── Publish Song (songs only) ──────────────────────────────────────────────
  const handlePublishSong = async () => {
    if (!title || !genre || !lyrics) {
      showFeedback('Title, Genre, and Lyrics are required to publish.', 'error');
      return;
    }
    setPublishing(true);
    try {
      const payload = {
        title,
        artistName: artistName || '',
        genre,
        coverImage: coverImageUrl,
        lyrics,
        summary: summary || '',
        tags,
        author,
        authorId,
        status
      };
      await axios.post(`${API_BASE_URL}/song/create`, payload);
      showFeedback(status === 'draft' ? 'Draft saved successfully! 💾' : 'Lyrics published successfully! 🎉', 'success');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      showFeedback(status === 'draft' ? 'Failed to save song draft.' : 'Failed to publish song.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  // ── Preview data (stories only) ────────────────────────────────────────────
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

  const getLyricsWordCount = () => {
    const words = lyrics.trim().split(/\s+/).filter(Boolean).length;
    const chars = lyrics.replace(/\s/g, '').length;
    return { words, chars };
  };

  return (
    <div className="post-page">
      {showPreview && contentType !== 'songs' && (
        <StoryReader story={previewStory} onClose={() => setShowPreview(false)} />
      )}

      <div className={`post-container ${collapsed ? 'post-expanded' : ''}`}>

        {/* Modern Segmented Toggle for Content Type */}
        <div className="post-type-toggle-container">
          <div className="post-type-toggle">
            <button
              className={`post-toggle-btn ${contentType === 'stories' ? 'active' : ''}`}
              onClick={() => setContentType('stories')}
            >
              📖 Stories
            </button>
            <button
              className={`post-toggle-btn ${contentType === 'songs' ? 'active' : ''}`}
              onClick={() => setContentType('songs')}
            >
              🎵 Songs
            </button>
          </div>
        </div>

        {/* Inline Feedback Banner */}
        {feedback && (
          <div className={`editor-feedback-banner ${feedbackType}`}>
            {feedback}
          </div>
        )}

        {/* ── Top bar ── */}
        <div className="post-topbar">
          <h1 className="post-heading">
            {contentType === 'songs' ? '🎤 Lyrics Editor' : '✍️ Story Editor'}
          </h1>
          <div className="post-topbar-actions">
            {contentType === 'songs' ? (
              <button className="btn-publish" onClick={handlePublishSong} disabled={publishing}>
                {publishing ? 'Saving...' : status === 'draft' ? '💾 Save Song Draft' : '🚀 Publish Song'}
              </button>
            ) : (
              <>
                {saveLabel && <span className="save-label">{saving ? '⟳ Saving...' : `✓ ${saveLabel}`}</span>}
                <button className="btn-outline" onClick={handleSaveDraft} disabled={saving}>
                  💾 Save Draft
                </button>
                <button className="btn-outline btn-preview" onClick={() => setShowPreview(true)}>
                  👁 Preview
                </button>
                <button className="btn-publish" onClick={handlePublish} disabled={publishing || coverUploading || uploadingBlockId !== null || !!coverUploadError}>
                  {coverUploading ? 'Uploading Cover Image...' : publishing ? 'Publishing Story...' : '🚀 Publish'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="editor-layout">

          {/* ══ LEFT: EDITOR AREA ══════════════════════════════════════════ */}
          <div className="editor-main">

            {/* Cover image */}
            <div className={`cover-upload-area ${coverImageUrl ? 'has-image' : ''} ${coverUploadError ? 'has-error' : ''}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {coverUploadError && (
                <div style={{ color: '#ff4d4f', padding: '10px', fontSize: '14px', textAlign: 'center', background: 'rgba(255,77,79,0.1)', borderRadius: '8px', marginBottom: '10px', width: '100%' }}>
                  ⚠️ {coverUploadError}
                </div>
              )}
              {!coverImageUrl ? (
                <div className="cover-placeholder" onClick={() => coverInputRef.current?.click()}>
                  {coverUploading
                    ? <span>⟳ Uploading...</span>
                    : <><span className="cover-icon">🖼️</span><span>Click to upload cover image</span></>
                  }
                </div>
              ) : (
                <>
                  <LazyImage src={coverImageUrl} alt="Cover Preview" className="cover-preview-img" />
                  <div className="cover-actions">
                    <button className="cover-btn" onClick={() => coverInputRef.current?.click()}>
                      🔄 Change
                    </button>
                    <button className="cover-btn cover-btn-remove" onClick={() => {
                      console.log('[DEBUG - CLIENT] Removing cover image.');
                      setCoverImageUrl('');
                      setCoverUploadError('');
                    }}>
                      🗑 Remove
                    </button>
                  </div>
                </>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />
            </div>

            {contentType === 'songs' ? (
              <>
                {/* Title */}
                <input
                  className="title-input"
                  type="text"
                  placeholder="Song / Poem Title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />

                {/* Summary */}
                <textarea
                  className="summary-input"
                  placeholder="Write a short summary/description for this song..."
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  rows={3}
                />

                {/* Lyrics textarea */}
                <textarea
                  className="lyrics-textarea"
                  placeholder="Write or paste your lyrics, verses, or poems here..."
                  value={lyrics}
                  onChange={e => setLyrics(e.target.value)}
                  rows={15}
                />

                {/* Live stats for lyrics */}
                <div className="word-count-bar">
                  <span>📊 Words: <strong>{getLyricsWordCount().words.toLocaleString()}</strong></span>
                  <span>Characters: <strong>{getLyricsWordCount().chars.toLocaleString()}</strong></span>
                </div>
              </>
            ) : (
              <>
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
                          <TextBlock
                            value={block.value}
                            placeholder="Tell your story..."
                            onChange={val => updateBlock(block.id, val)}
                          />
                      ) : (
                        <div className={`image-block ${block.uploading ? 'uploading' : ''}`} style={{ height: '300px', position: 'relative' }}>
                          {block.uploading
                            ? <div className="image-block-loader">⟳ Uploading image...</div>
                            : <LazyImage src={block.value} alt={`Story image ${idx}`} className="editor-inline-image" />
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
              </>
            )}

          </div>

          {/* ══ RIGHT: SETTINGS PANEL ══════════════════════════════════════ */}
          <aside className="settings-panel">
            <h3 className="settings-title">
              {contentType === 'songs' ? '🎤 Lyrics Settings' : '⚙️ Story Settings'}
            </h3>

            {/* Optional Artist Name Input for Songs */}
            {contentType === 'songs' && (
              <div className="settings-group">
                <label className="settings-label">Artist Name <span className="optional">(optional)</span></label>
                <input
                  className="artist-input"
                  type="text"
                  placeholder="e.g. Original Singer/Band"
                  value={artistName}
                  onChange={e => setArtistName(e.target.value)}
                />
              </div>
            )}

            {/* Genre */}
            <div className="settings-group">
              <label className="settings-label">Genre</label>
              <select
                className="settings-select"
                value={genre}
                onChange={e => setGenre(e.target.value)}
              >
                <option value="">Select genre...</option>
                {(contentType === 'songs' ? SONG_GENRES : GENRES).map(g => (
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

            {contentType !== 'songs' && (
              <>
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
              </>
            )}

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

            {/* Quick actions */}
            <div className="settings-actions">
              {contentType === 'songs' ? (
                <button className="btn-publish btn-full" onClick={handlePublishSong} disabled={publishing}>
                  {publishing ? 'Saving...' : status === 'draft' ? '💾 Save Song Draft' : '🚀 Publish Song'}
                </button>
              ) : (
                <>
                  <button className="btn-outline btn-full" onClick={handleSaveDraft} disabled={saving}>
                    💾 Save Draft
                  </button>
                  <button className="btn-publish btn-full" onClick={handlePublish} disabled={publishing || coverUploading}>
                    {coverUploading ? 'Uploading Cover Image...' : publishing ? 'Publishing Story...' : '🚀 Publish Story'}
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PostPage;