import React, { useState, useEffect } from 'react';
import './ContentSummary.css';
 
const ContentSummary = () => {
  const [allContent, setAllContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isScrolled, setIsScrolled] = useState(false);
  const itemsPerPage = 6;
 
  // Handle scroll event for header styling
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch all content from backend API
  const fetchAllContent = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://10.10.20.156:3018/api/content/all`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No content found. Try adding some data first using POST /store-llm');
        }
        throw new Error('Failed to fetch content');
      }
      const data = await response.json();
      setAllContent(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setAllContent([]);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchAllContent();
  }, []);
 
  // Parse keypoints (handling both string and array formats)
  const parseKeypoints = (keypoints) => {
    if (typeof keypoints === 'string') {
      try {
        return JSON.parse(keypoints);
      } catch {
        return keypoints.split('\n').filter(point => point.trim());
      }
    }
    return Array.isArray(keypoints) ? keypoints : [];
  };
 
  // Parse tags (handling both string and array formats)
  const parseTags = (tags) => {
    if (typeof tags === 'string') {
      try {
        return JSON.parse(tags);
      } catch {
        return tags.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }
    return Array.isArray(tags) ? tags : [];
  };
 
  // Pagination logic
  const totalPages = Math.ceil(allContent.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentContent = allContent.slice(startIndex, endIndex);
 
  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll to top function
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
 
  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };
 
  if (loading) {
    return (
      <div className="news-container">
        <header className={`news-header sticky-header ${isScrolled ? 'scrolled' : ''}`}>
          <div className="header-content">
            <h1 className="site-title" onClick={scrollToTop}>Content Chronicle</h1>
            <div className="header-actions">
              <button className="refresh-btn" onClick={fetchAllContent}>
                <span className="refresh-icon">↻</span>
              </button>
            </div>
          </div>
        </header>
        <div className="loading-container">
          <div className="loading-content">
            <div className="spinner"></div>
            <p className="loading-text">Loading latest stories...</p>
          </div>
        </div>
      </div>
    );
  }
 
  if (error) {
    return (
      <div className="news-container">
        <header className={`news-header sticky-header ${isScrolled ? 'scrolled' : ''}`}>
          <div className="header-content">
            <h1 className="site-title" onClick={scrollToTop}>Content Chronicle</h1>
            <div className="header-actions">
              <button className="refresh-btn" onClick={fetchAllContent}>
                <span className="refresh-icon">↻</span>
              </button>
            </div>
          </div>
        </header>
        <div className="error-container">
          <div className="error-content">
            <p className="error-text">Unable to load stories</p>
            <p className="error-detail">{error}</p>
            <button onClick={fetchAllContent} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }
 
  if (allContent.length === 0) {
    return (
      <div className="news-container">
        <header className={`news-header sticky-header ${isScrolled ? 'scrolled' : ''}`}>
          <div className="header-content">
            <h1 className="site-title" onClick={scrollToTop}>Content Chronicle</h1>
            <div className="header-actions">
              <button className="refresh-btn" onClick={fetchAllContent}>
                <span className="refresh-icon">↻</span>
              </button>
            </div>
          </div>
        </header>
        <div className="no-content-container">
          <p className="no-content-text">No stories available yet</p>
          <p className="no-content-subtitle">Check back soon for the latest updates</p>
        </div>
      </div>
    );
  }
 
  return (
    <div className="news-container">
      {/* Sticky Header */}
      <header className={`news-header sticky-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-content">
          <h1 className="site-title" onClick={scrollToTop}>COGNI-ARTICLE</h1>
          <div className="header-actions">
            <div className="content-stats">
              <span className="stats-text">
                {allContent.length} Articles • Page {currentPage} of {totalPages}
              </span>
            </div>
            <button className="refresh-btn" onClick={fetchAllContent} title="Refresh content">
              <span className="refresh-icon">↻</span>
            </button>
          </div>
        </div>
      </header>
 
      <main className="main-content">
        <div className="articles-grid">
          {currentContent.map((content) => {
            const keypoints = parseKeypoints(content.keypoints);
            const tags = parseTags(content.tags);
            return (
              <article key={content.id} className="news-article">
                <div className="article-header">
                  <div className="article-meta">
                  </div>
                </div>
                <div className="article-content">
                  <h2 className="article-headline">{content.heading}</h2>
                  <p className="article-lead">{content.summary}</p>
                  {/* Key Points as Article Highlights */}
                  {keypoints.length > 0 && (
                    <div className="article-highlights">
                      <ul className="highlights-list">
                        {keypoints.slice(0, 4).map((point, index) => (
                          <li key={index} className="highlight-item">{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* Tags as Topics */}
                  {tags.length > 0 && (
                    <div className="article-topics">
                      <span className="topics-label">Tags:</span>
                      <div className="topics-list">
                        {tags.map((tag, index) => (
                          <span key={index} className="topic-tag">
                            {tag.startsWith('#') ? tag : `#${tag}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
 
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination-container">
            <div className="pagination">
              <button 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn pagination-prev"
              >
                ← Previous
              </button>
              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => goToPage(page)}
                    className={`pagination-page ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn pagination-next"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Scroll to top button */}
        {isScrolled && (
          <button className="scroll-to-top" onClick={scrollToTop} title="Scroll to top">
            ↑
          </button>
        )}
      </main>
    </div>
  );
};
 
export default ContentSummary;