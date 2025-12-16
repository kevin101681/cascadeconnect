import React from 'react';
import { X } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  imageName: string;
  onClose: () => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ imageUrl, imageName, onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-[backdrop-fade-in_0.2s_ease-out]"
      onClick={onClose} // Close when clicking outside the image
    >
      <div 
        className="relative bg-surface dark:bg-gray-800 rounded-2xl shadow-xl max-w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on the modal content
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
          aria-label="Close image viewer"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4">
          <img 
            src={imageUrl} 
            alt={imageName} 
            className="max-w-full max-h-full object-contain" 
          />
        </div>

        {/* Image Name */}
        <div className="p-4 border-t border-surface-outline-variant dark:border-gray-700 bg-surface-container dark:bg-gray-700 text-center">
          <p className="text-sm text-surface-on dark:text-gray-100 truncate">{imageName}</p>
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;

