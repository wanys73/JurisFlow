import React from 'react';

/**
 * Composant d'arrière-plan animé Soft & Clean
 * Blobs pastels très subtils (Vert Menthe, Bleu Ciel, Cyan Doux) qui bougent doucement
 */
const SoftAuroraBackground = () => {
  return (
    <div className="fixed inset-0 -z-50 overflow-hidden bg-slate-50/50 pointer-events-none">
      {/* Blob 1 - Vert Menthe */}
      <div className="absolute bg-emerald-300 w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob top-0 left-0" />
      
      {/* Blob 2 - Bleu Ciel */}
      <div className="absolute bg-blue-200 w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-2000 top-0 right-0" />
      
      {/* Blob 3 - Cyan Doux */}
      <div className="absolute bg-cyan-200 w-[50rem] h-[50rem] rounded-full mix-blend-multiply filter blur-[100px] opacity-30 animate-blob animation-delay-4000 -bottom-32 left-20" />
    </div>
  );
};

export default SoftAuroraBackground;

