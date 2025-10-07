import React, { useState, useCallback, useEffect } from "react";
import { Button, Card, CardBody } from "@heroui/react";

import { apiService } from "@/services/api";
import { VersionHistory } from "@/types/graph";
import { VERSION_HISTORY_LIMIT } from "@/constants/graph";

interface VersionHistoryListProps {
  graphId: string;
  onRestore: (version: number) => void;
  onDelete: (version: number) => Promise<void>;
  onSetActive: (version: number) => Promise<void>;
}

const VersionHistoryList: React.FC<VersionHistoryListProps> = ({
  graphId,
  onRestore,
  onDelete,
  onSetActive,
}) => {
  const [versions, setVersions] = useState<VersionHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadVersions = useCallback(async () => {
    setIsLoading(true);
    try {
      const versionHistory = await apiService.getVersionHistory(
        graphId,
        VERSION_HISTORY_LIMIT,
      );

      setVersions(versionHistory);
    } catch (error) {
      console.error("Failed to load version history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [graphId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleDelete = useCallback(
    async (version: number) => {
      await onDelete(version);
      // Reload versions after deletion
      await loadVersions();
    },
    [onDelete, loadVersions],
  );

  const handleSetActive = useCallback(
    async (version: number) => {
      await onSetActive(version);
      // Reload versions after setting active
      await loadVersions();
    },
    [onSetActive, loadVersions],
  );

  if (isLoading) {
    return <div className="text-center py-4">Loading versions...</div>;
  }

  if (versions.length === 0) {
    return (
      <div className="text-center py-4 text-gray-600">
        No published versions yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {versions.map((version) => (
        <Card
          key={version.version}
          className={`border ${version.is_active ? "border-green-500 bg-green-50" : "border-gray-200"}`}
        >
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Version {version.version}
                  </h3>
                  {version.is_active && (
                    <span className="px-2 py-0.5 text-xs font-semibold text-green-700 bg-green-200 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{version.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Published:{" "}
                  {new Date(version.published_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    size="sm"
                    onPress={() => onRestore(version.version)}
                  >
                    Restore
                  </Button>
                  {!version.is_active && (
                    <Button
                      color="success"
                      size="sm"
                      variant="flat"
                      onPress={() => handleSetActive(version.version)}
                    >
                      Set Active
                    </Button>
                  )}
                </div>
                <Button
                  color="danger"
                  size="sm"
                  variant="flat"
                  onPress={() => handleDelete(version.version)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
};

export default VersionHistoryList;
