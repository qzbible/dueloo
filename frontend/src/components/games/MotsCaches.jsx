import React from 'react';

const MotsCaches = ({ onSubmit }) => {
  return (
    <div className="max-w-4xl mx-auto text-center">
      <div className="p-12 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
        <p className="text-2xl text-white mb-4">Mots Cachés Bibliques</p>
        <p className="text-blue-200 mb-6">Ce jeu sera bientôt disponible avec une grille interactive !</p>
        <button 
          onClick={() => onSubmit({ matches: 0 })}
          className="px-6 py-3 bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg"
        >
          Retour
        </button>
      </div>
    </div>
  );
};

export default MotsCaches;
