import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import { Attachment } from '../types';
import ImageEditor from './ImageEditor';

interface ImageViewerModalProps {
  isOpen: boolean;
  attachments: Attachment[];
  initialIndex: number;
  onClose: () => void;
  onUpdateAttachment?: (index: number, updatedUrl: string) => void;
}

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  isOpen,
  attachments,
  initialIndex,
  onClose,
  onUpdateAttachment
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isEditing, setIsEditing] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter to only show images
  const imageAttachments = attachments.filter(att => att.type === 'IMAGE' && att.url);
  
  // Update current index when initialIndex changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsEditing(false);
      // Focus the modal for keyboard navigation
      if (modalRef.current) {
        modalRef.current.focus();
      }
    }
  }, [isOpen, initialIndex]);
  
  if (!isOpen || imageAttachments.length === 0) return null;

  const currentImage = imageAttachments[currentIndex];
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < imageAttachments.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(currentIndex - 1);
      setIsEditing(false);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft' && hasPrevious) {
      handlePrevious();
    } else if (e.key === 'ArrowRight' && hasNext) {
      handleNext();
    } else if (e.key === 'Escape') {
      if (isEditing) {
        setIsEditing(false);
      } else {
        onClose();
      }
    }
  };

  const handleSaveEdit = (editedImageUrl: string) => {
    if (onUpdateAttachment) {
      const originalIndex = attachments.findIndex(att => att.url === currentImage.url);
      if (originalIndex !== -1) {
        onUpdateAttachment(originalIndex, editedImageUrl);
      }
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <ImageEditor
        imageUrl={currentImage.url}
        imageName={currentImage.name || 'Image'}
        onSave={handleSaveEdit}
        onClose={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        className="relative bg-surface dark:bg-gray-800 rounded-3xl shadow-elevation-5 max-w-7xl max-h-[90vh] w-full mx-4 overflow-hidden animate-[scale-in_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-outline-variant dark:border-gray-700">
          <div className="flex items-center gap-4">
            <span className="text-sm text-surface-on-variant dark:text-gray-400">
              {currentIndex + 1} of {imageAttachments.length}
            </span>
            <span className="text-sm font-medium text-surface-on dark:text-gray-100">
              {currentImage.name || 'Image'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 transition-colors"
              title="Edit Image"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Image Container */}
        <div className="relative flex items-center justify-center bg-black/50 min-h-[60vh] max-h-[calc(90vh-120px)]">
          {/* Previous Button */}
          {hasPrevious && (
            <button
              onClick={handlePrevious}
              className="absolute left-4 p-3 rounded-full bg-surface/90 dark:bg-gray-800/90 hover:bg-surface dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 shadow-elevation-2 transition-all z-10"
              title="Previous Image"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}

          {/* Image */}
          <div className="flex items-center justify-center p-8 max-w-full max-h-full">
            <img
              src={currentImage.url}
              alt={currentImage.name || 'Image'}
              className="max-w-full max-h-[calc(90vh-120px)] object-contain rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>

          {/* Next Button */}
          {hasNext && (
            <button
              onClick={handleNext}
              className="absolute right-4 p-3 rounded-full bg-surface/90 dark:bg-gray-800/90 hover:bg-surface dark:hover:bg-gray-700 text-surface-on dark:text-gray-100 shadow-elevation-2 transition-all z-10"
              title="Next Image"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Footer Navigation */}
        {imageAttachments.length > 1 && (
          <div className="p-4 border-t border-surface-outline-variant dark:border-gray-700 flex items-center justify-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={!hasPrevious}
              className="px-4 py-2 rounded-lg bg-surface-container dark:bg-gray-700 hover:bg-surface-container-high dark:hover:bg-gray-600 text-surface-on dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <div className="flex gap-1">
              {imageAttachments.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setCurrentIndex(idx);
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-primary w-8'
                      : 'bg-surface-outline-variant dark:bg-gray-600 hover:bg-surface-outline dark:hover:bg-gray-500'
                  }`}
                  title={`Go to image ${idx + 1}`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              disabled={!hasNext}
              className="px-4 py-2 rounded-lg bg-surface-container dark:bg-gray-700 hover:bg-surface-container-high dark:hover:bg-gray-600 text-surface-on dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewerModal;
