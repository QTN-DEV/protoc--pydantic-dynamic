import React, { useState } from "react";
import Swal from "sweetalert2";

import { renderHumanFriendlyData } from "../../utils/rendering";

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
          <button
            className="w-8 h-8 flex items-center justify-center rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            title={isMaximized ? "Minimize" : "Maximize"}
            onClick={toggleMaximize}
          >
            {isMaximized ? "🗗" : "🗖"}
          </button>
          <button
            className="w-8 h-8 flex items-center justify-center rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
            title="Close"
            onClick={handleClose}
          >
            ✕
          </button>
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
