import React, { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../contexts/AuthContext';

interface CreatePostProps {
  onPostCreated: () => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onPostCreated }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoGenerateHashtags, setAutoGenerateHashtags] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.createPost({
        userID: user.userID,
        title,
        content,
        hashtag: autoGenerateHashtags,
      });

      if (response.message && response.message.includes('SUCCESSFULLY')) {
        setTitle('');
        setContent('');
        setAutoGenerateHashtags(false);
        onPostCreated();
      } else {
        setError('Failed to create post. Please try again.');
      }
    } catch (err) {
      setError('Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-effect rounded-xl p-6 mb-6 animate-slide-up">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-neutral-600 to-neutral-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
          {user?.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="text-neutral-200 font-semibold">{user?.name}</h3>
          <p className="text-neutral-400 text-sm">Share your thoughts...</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full px-4 py-3 bg-dark-700/50 border border-neutral-500/30 rounded-lg text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
            required
          />
        </div>

        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share more details..."
            rows={4}
            className="w-full px-4 py-3 bg-dark-700/50 border border-neutral-500/30 rounded-lg text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200 resize-none"
            required
          />
        </div>

        {/* Hashtag Checkbox */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGenerateHashtags}
              onChange={(e) => setAutoGenerateHashtags(e.target.checked)}
              className="w-4 h-4 text-emerald-600 bg-dark-700 border-neutral-500 rounded focus:ring-emerald-500 focus:ring-2"
            />
            <span className="text-neutral-300 text-sm">Auto-generate hashtags for this post</span>
          </label>
          {autoGenerateHashtags && (
            <div className="flex items-center space-x-1 text-emerald-400 text-xs">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Hashtags will be generated after posting</span>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-neutral-500 text-sm">
            {content.length}/500 characters
          </div>
          <button
            type="submit"
            disabled={loading || !title.trim() || !content.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed hover:animate-glow"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Posting...</span>
              </div>
            ) : (
              'Post'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreatePost;
