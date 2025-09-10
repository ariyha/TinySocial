import React, { useState } from 'react';
import { Post } from '../types';
import { api } from '../api';

interface PostCardProps {
  post: Post;
  onShare?: (postId: number) => void;
}

const PostCard: React.FC<PostCardProps> = ({ post, onShare }) => {
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [loadingHashtags, setLoadingHashtags] = useState(false);
  const [showHashtags, setShowHashtags] = useState(false);

  const formatDate = (date: string, time: string) => {
    return new Date(`${date} ${time}`).toLocaleString();
  };

  const generateHashtags = async () => {
    setLoadingHashtags(true);
    try {
      const response = await api.generateHashtags(post.postId);
      if (response.hashtags) {
        setHashtags(response.hashtags);
        setShowHashtags(true);
      }
    } catch (error) {
      console.error('Failed to generate hashtags:', error);
    } finally {
      setLoadingHashtags(false);
    }
  };

  return (
    <div className="glass-effect rounded-xl p-6 hover:bg-dark-700/30 transition-all duration-300 animate-slide-up group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-neutral-600 to-neutral-700 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {post.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-neutral-200 font-semibold">{post.name}</h3>
            <p className="text-neutral-400 text-sm">@{post.userId}</p>
          </div>
        </div>
        <div className="text-neutral-500 text-sm">
          {formatDate(post.date, post.time)}
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-neutral-100 font-semibold text-lg mb-2">{post.title}</h4>
        <p className="text-neutral-300 leading-relaxed">{post.content}</p>
      </div>

      {/* Hashtags Display */}
      {showHashtags && hashtags.length > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {hashtags.map((hashtag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors duration-200 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {post.shared && (
        <div className="mb-4">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            🔄 Shared
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-neutral-500/20">
        <div className="flex items-center space-x-4">
          <button
            onClick={generateHashtags}
            disabled={loadingHashtags}
            className="flex items-center space-x-2 text-neutral-400 hover:text-emerald-400 transition-colors duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingHashtags ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            )}
            <span className="text-sm">{loadingHashtags ? 'Generating...' : 'Translate'}</span>
          </button>
        </div>

        {onShare && (
          <button
            onClick={() => onShare(post.postId)}
            className="flex items-center space-x-2 text-neutral-400 hover:text-emerald-400 transition-colors duration-200 group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span className="text-sm">Share</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PostCard;
