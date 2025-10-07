import React, { useState } from "react";
import { Button } from "@heroui/react";
import Swal from "sweetalert2";

import { renderHumanFriendlyData } from "@/utils/rendering";

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
