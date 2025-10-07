import React, { useRef, useEffect } from "react";

interface GraphNameEditorProps {
  name: string;
  isEditing: boolean;
  onNameClick: () => void;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

const GraphNameEditor: React.FC<GraphNameEditorProps> = ({
  name,
  isEditing,
  onNameClick,
  onNameChange,
  onSave,
  onCancel,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  return (
    <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
      {isEditing ? (
        <input
          ref={inputRef}
          className="text-lg font-semibold text-gray-800 bg-transparent border-none outline-none focus:ring-0"
          style={{ minWidth: "200px" }}
          type="text"
          value={name}
          onBlur={onSave}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSave();
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
        />
      ) : (
        <button
          className="text-lg font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors bg-transparent border-none"
          tabIndex={0}
          type="button"
          onClick={onNameClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              onNameClick();
            }
          }}
        >
          {name}
        </button>
      )}
    </div>
  );
};

export default GraphNameEditor;
