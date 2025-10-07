import React, { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Textarea,
} from "@heroui/react";
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

  return (
    <Modal
      isOpen={isOpen}
      scrollBehavior="inside"
      size="2xl"
      onOpenChange={onOpenChange}
    >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex items-center justify-between">
                <span>AI Generator</span>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onPress={showHelp}
                >
                  ?
                </Button>
              </ModalHeader>
              <ModalBody>
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
                    <Textarea
                      minRows={4}
                      placeholder="Enter system instructions for the AI model..."
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
                    <Textarea
                      minRows={4}
                      placeholder="Enter a test prompt to generate data..."
                      value={promptTest}
                      onChange={(e) => setPromptTest(e.target.value)}
                    />
                  </div>

                  {/* Info card */}
                  <Card className="bg-purple-50 border border-purple-200">
                    <CardBody className="p-3">
                      <p className="text-sm text-purple-700">
                        <strong>💡 How it works:</strong> The AI will generate
                        structured data based on your graph&apos;s Pydantic
                        schema. The system prompt provides context, and the test
                        prompt describes what you want to generate.
                      </p>
                    </CardBody>
                  </Card>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="danger"
                  variant="light"
                  onPress={() => onOpenChange(false)}
                >
                  Close
                </Button>
                {promptTest.trim() && (
                  <Button
                    className="bg-purple-500 text-white"
                    isDisabled={isGenerating}
                    isLoading={isGenerating}
                    onPress={handleGenerate}
                  >
                    Start Generation
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
  );
};
