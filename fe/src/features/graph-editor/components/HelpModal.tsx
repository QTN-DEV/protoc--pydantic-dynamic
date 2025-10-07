import React from "react";

interface HelpModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onOpenChange }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold">Welcome to PCDNGE!</h2>
            <p className="text-sm text-gray-600">
              Pydantic Class Definition Network Graph Editor
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <section>
                  <h3 className="text-lg font-semibold mb-2">
                    🎯 How It Works
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                    <li>
                      Create nodes by clicking the <strong>+</strong> button at
                      the top center
                    </li>
                    <li>
                      Each node represents a class definition in your network
                      graph
                    </li>
                    <li>
                      Click and drag nodes to reposition them on the canvas
                    </li>
                    <li>Your changes are automatically saved every second</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">
                    🔗 Connecting Nodes
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                    <li>
                      Drag from a node&apos;s handle (blue circles on sides) to
                      another node to create a connection
                    </li>
                    <li>
                      <span className="text-blue-600 font-medium">
                        Blue arrows
                      </span>{" "}
                      = One-way connection
                    </li>
                    <li>
                      <span className="text-red-600 font-medium">
                        Red arrows
                      </span>{" "}
                      = Two-way connection
                    </li>
                    <li>
                      Click on any edge to edit it - you can change direction
                      or make it two-way
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">✏️ Editing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                    <li>
                      Click the graph name (top-left) to rename your project
                    </li>
                    <li>Click the node name to edit it directly</li>
                    <li>
                      Delete nodes using the × button in the top-right corner
                      of each node
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">📤 Publishing</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                    <li>
                      Click the{" "}
                      <strong className="text-green-600">Publish</strong>{" "}
                      button (top-right) to create a versioned snapshot
                    </li>
                    <li>Each publish creates a new version (v1, v2, v3...)</li>
                    <li>
                      Published versions are immutable - you can continue
                      editing while keeping stable snapshots
                    </li>
                    <li>
                      Use published versions in production while working on the
                      next iteration
                    </li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold mb-2">💡 Tips</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-700 pl-4">
                    <li>
                      Zoom in/out using your mouse wheel or the controls
                      (bottom-left)
                    </li>
                    <li>
                      Pan around by clicking and dragging on the empty canvas
                    </li>
                    <li>
                      The graph will automatically fit to view when loaded
                    </li>
                  </ul>
                </section>

                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>💡 Need help later?</strong> You can always reopen
                    this guide by clicking the help button (?) in the
                    bottom-right corner.
                  </p>
                </div>
              </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            className="px-4 py-2 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => onOpenChange(false)}
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
