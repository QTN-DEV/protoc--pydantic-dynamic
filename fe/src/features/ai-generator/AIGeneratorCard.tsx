import React, { useState } from "react";
import Swal from "sweetalert2";

interface AIGeneratorCardProps {
  graphId: string;
  systemPrompt: string;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSystemPromptChange: (prompt: string) => void;
  onGenerate: (prompt: string) => Promise<void>;
  onBeforeGenerate?: () => Promise<void>;
}

export const AIGeneratorCard: React.FC<AIGeneratorCardProps> = ({
  systemPrompt,
  isOpen,
  onOpenChange,
  onSystemPromptChange,
  onGenerate,
  onBeforeGenerate,
}) => {
  const [promptTest, setPromptTest] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!promptTest.trim()) return;

    setIsGenerating(true);
    try {
      // Call beforeGenerate hook (e.g., to autosave)
      if (onBeforeGenerate) {
        await onBeforeGenerate();
      }

      // Generate
      await onGenerate(promptTest);

      // Show success message
      await Swal.fire({
        icon: "success",
        title: "Generation Complete!",
        text: "Check the response sidebar for the generated result.",
        confirmButtonText: "OK",
      });

      // Clear prompt test
      setPromptTest("");
    } catch (error) {
      console.error("Generation failed:", error);
      await Swal.fire({
        icon: "error",
        title: "Generation Failed",
        text:
          error instanceof Error ? error.message : "Failed to generate data",
        confirmButtonText: "OK",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const showHelp = () => {
    Swal.fire({
      icon: "info",
      title: "AI Generator Help",
      html: `
        <div class="text-left space-y-3">
          <div>
            <strong>System Prompt:</strong>
            <p class="text-sm text-gray-600 mt-1">
              This prompt will be stored as PCDNGE's system prompt. It provides context and instructions to the AI model about how to generate data based on your graph schema.
            </p>
          </div>
          <div>
            <strong>Prompt Test:</strong>
            <p class="text-sm text-gray-600 mt-1">
              This is used to test the generation. Enter a natural language description of the data you want to generate, and the AI will create structured data matching your graph schema.
            </p>
          </div>
          <div class="bg-blue-50 p-3 rounded mt-3">
            <p class="text-sm text-blue-700">
              <strong>💡 Tip:</strong> The system prompt is saved automatically, while the prompt test is temporary and used only for testing.
            </p>
          </div>
        </div>
      `,
      confirmButtonText: "Got it!",
      width: 600,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <span className="text-lg font-semibold">AI Generator</span>
          <button
            className="w-8 h-8 text-lg text-gray-600 hover:text-gray-800 transition-colors"
            onClick={showHelp}
          >
            ?
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  System Prompt
                </label>
                <span className="text-xs text-gray-500">
                  (saved automatically)
                </span>
              </div>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter system instructions for the AI model..."
                rows={4}
                value={systemPrompt}
                onChange={(e) => onSystemPromptChange(e.target.value)}
              />
            </div>

            {/* Prompt Test */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">
                  Prompt Test
                </label>
                <span className="text-xs text-gray-500">
                  (temporary, for testing)
                </span>
              </div>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Enter a test prompt to generate data..."
                rows={4}
                value={promptTest}
                onChange={(e) => setPromptTest(e.target.value)}
              />
            </div>

            {/* Info card */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <p className="text-sm text-purple-700">
                <strong>💡 How it works:</strong> The AI will generate
                structured data based on your graph&apos;s Pydantic
                schema. The system prompt provides context, and the test
                prompt describes what you want to generate.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-lg font-medium transition-colors text-red-600 hover:text-red-700"
            onClick={() => onOpenChange(false)}
          >
            Close
          </button>
          {promptTest.trim() && (
            <button
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isGenerating}
              onClick={handleGenerate}
            >
              {isGenerating ? "Generating..." : "Start Generation"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
