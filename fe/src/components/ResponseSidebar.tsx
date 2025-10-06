import React, { useState } from "react";
import { Button } from "@heroui/react";
import Swal from "sweetalert2";

interface ResponseSidebarProps {
  response: any;
  onClose: () => void;
}

const ResponseSidebar: React.FC<ResponseSidebarProps> = ({
  response,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);

  const handleClose = () => {
    Swal.fire({
      title: "Close Response?",
      text: "The API response will be deleted and cannot be recovered.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, close it",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    }).then((result) => {
      if (result.isConfirmed) {
        onClose();
      }
    });
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  const renderHumanFriendlyData = (data: any, depth: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    const paddingLeft = depth * 18; // 18px per level
    const headingSize = Math.max(1, 4 - depth); // h1 to h4, then h4 for deeper levels

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      Object.entries(data).forEach(([key, value], index) => {
        const HeadingTag = `h${Math.min(headingSize, 6)}` as keyof JSX.IntrinsicElements;

        elements.push(
          <div key={`${depth}-${key}-${index}`} className="mb-2" style={{ paddingLeft: `${paddingLeft}px` }}>
            <HeadingTag className="font-bold text-gray-800 mt-4 first:mt-0">
              {key.split(" ").map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(" ")}
            </HeadingTag>
            <div>
              {typeof value === 'object' && value !== null ? (
                <div>
                  {renderHumanFriendlyData(value, depth + 1)}
                </div>
              ) : Array.isArray(value) ? (
                <div>
                  {value.map((item, i) => (
                    <div key={`${key}-item-${i}`} className="mb-2">
                      {typeof item === 'object' && item !== null ? (
                        <div>
                          <div className="font-medium text-gray-600 mb-1">Item {i + 1}:</div>
                          {renderHumanFriendlyData(item, depth + 1)}
                        </div>
                      ) : (
                        <div className="text-gray-700">• {String(item)}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-700 whitespace-pre-wrap break-words">
                  {String(value)}
                </div>
              )}
            </div>
          </div>
        );
      });
    } else if (Array.isArray(data)) {
      data.forEach((item, index) => {
        elements.push(
          <div key={`array-${index}`} style={{ paddingLeft: `${paddingLeft}px` }} className="mb-1">
            {typeof item === 'object' && item !== null ? (
              <div>
                <div className="font-medium text-gray-600 mb-1">Item {index + 1}:</div>
                {renderHumanFriendlyData(item, depth + 1)}
              </div>
            ) : (
              <div className="text-gray-700">• {String(item)}</div>
            )}
          </div>
        );
      });
    } else {
      elements.push(
        <div key={`primitive-${depth}`} style={{ paddingLeft: `${paddingLeft}px` }} className="text-gray-700">
          {String(data)}
        </div>
      );
    }

    return elements;
  };

  const sidebarStyles = isMaximized
    ? "fixed top-0 left-0 right-0 bottom-0 z-30"
    : "fixed right-4 top-4 z-20 w-80 h-[80vh]";

  return (
    <div
      className={`${sidebarStyles} overflow-y-auto  border border-gray-300 rounded-lg p-4 bg-white/80 backdrop-blur-sm`}
    >
      <div className="space-y-3 h-full flex flex-col">
        {/* Header with controls */}
        <div className="flex items-center gap-2 absolute top-2 right-2">
          <Button
            isIconOnly
            color="primary"
            size="sm"
            title={isMaximized ? "Minimize" : "Maximize"}
            variant="flat"
            onPress={toggleMaximize}
          >
            {isMaximized ? "🗗" : "🗖"}
          </Button>
          <Button
            isIconOnly
            color="danger"
            size="sm"
            title="Close"
            variant="flat"
            onPress={handleClose}
          >
            ✕
          </Button>
        </div>

        {/* Human-Friendly Content */}
        <div className="text-sm overflow-auto h-full">
          {renderHumanFriendlyData(response.result)}
        </div>
      </div>
    </div>
  );
};

export default ResponseSidebar;
