import { useState, useCallback, useEffect } from "react";
import Swal from "sweetalert2";
import { Node, Edge } from "@xyflow/react";

import { apiService } from "../services/api";

interface UseGraphVersionProps {
  graphId: string;
  onRestoreNodes: (
    nodes: Node[],
    edges: Edge[],
    updateNodeName: (id: string, name: string) => void,
    onEditNode: (id: string) => void,
    onDeleteNode: (id: string) => void,
  ) => void;
}

export const useGraphVersion = ({
  graphId,
  onRestoreNodes,
}: UseGraphVersionProps) => {
  const [latestVersion, setLatestVersion] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // Load latest version on mount
  useEffect(() => {
    const loadLatestVersion = async () => {
      try {
        const versionInfo = await apiService.getLatestVersion(graphId);

        setLatestVersion(versionInfo.version);
      } catch (error) {
        console.error("Failed to load version info:", error);
      }
    };

    loadLatestVersion();
  }, [graphId]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    try {
      const result = await Swal.fire({
        icon: "question",
        title: "Publish Graph",
        text: "Do you want to set this new version as the active version?",
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: "Yes, set as active",
        denyButtonText: "No, just publish",
        cancelButtonText: "Cancel",
      });

      if (result.isDismissed) {
        setIsPublishing(false);

        return;
      }

      const setAsActive = result.isConfirmed;
      const publishResult = await apiService.publishGraph(graphId, setAsActive);

      setLatestVersion(publishResult.version);

      await Swal.fire({
        icon: "success",
        title: "Published!",
        html: `
          ${publishResult.message} - Version ${publishResult.version}
          ${setAsActive ? '<br/><span class="text-green-600">This version is now active.</span>' : ""}
        `,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("Failed to publish graph:", error);
      await Swal.fire({
        icon: "error",
        title: "Publish Failed",
        text: "Failed to publish graph. Please try again.",
        confirmButtonText: "OK",
      });
    } finally {
      setIsPublishing(false);
    }
  }, [graphId]);

  const handleRestoreVersion = useCallback(
    async (
      version: number,
      updateNodeName: (id: string, name: string) => void,
      onEditNode: (id: string) => void,
      onDeleteNode: (id: string) => void,
    ) => {
      try {
        const result = await Swal.fire({
          icon: "warning",
          title: "Restore Version?",
          text: `Are you sure you want to restore version ${version}? This will replace your current work.`,
          showCancelButton: true,
          confirmButtonText: "Yes, restore it",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) return false;

        const graphState = await apiService.restoreVersion(graphId, version);

        onRestoreNodes(
          graphState.nodes,
          graphState.edges,
          updateNodeName,
          onEditNode,
          onDeleteNode,
        );

        await Swal.fire({
          icon: "success",
          title: "Restored!",
          text: `Version ${version} has been restored successfully.`,
          confirmButtonText: "OK",
        });

        return true;
      } catch (error) {
        console.error("Failed to restore version:", error);
        await Swal.fire({
          icon: "error",
          title: "Restore Failed",
          text: "Failed to restore version. Please try again.",
          confirmButtonText: "OK",
        });

        return false;
      }
    },
    [graphId, onRestoreNodes],
  );

  const handleDeleteVersion = useCallback(
    async (version: number) => {
      try {
        const result = await Swal.fire({
          icon: "warning",
          title: "Delete Version?",
          text: `Are you sure you want to delete version ${version}? This action cannot be undone.`,
          showCancelButton: true,
          confirmButtonText: "Yes, delete it",
          cancelButtonText: "Cancel",
          confirmButtonColor: "#d33",
        });

        if (!result.isConfirmed) return;

        await apiService.deleteVersion(graphId, version);

        // Reload version history to reflect the deletion
        const versionHistory = await apiService.getVersionHistory(graphId, 5);

        // Update latest version if we deleted the latest one
        if (latestVersion === version) {
          const newLatest = versionHistory[0]?.version || null;

          setLatestVersion(newLatest);
        }

        await Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: `Version ${version} has been deleted successfully.`,
          confirmButtonText: "OK",
        });
      } catch (error) {
        console.error("Failed to delete version:", error);
        await Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text: "Failed to delete version. Please try again.",
          confirmButtonText: "OK",
        });
      }
    },
    [graphId, latestVersion],
  );

  const handleSetActiveVersion = useCallback(
    async (version: number) => {
      try {
        const result = await Swal.fire({
          icon: "question",
          title: "Set Active Version?",
          text: `Are you sure you want to set version ${version} as the active version?`,
          showCancelButton: true,
          confirmButtonText: "Yes, set as active",
          cancelButtonText: "Cancel",
        });

        if (!result.isConfirmed) return;

        await apiService.setActiveVersion(graphId, version);

        await Swal.fire({
          icon: "success",
          title: "Success!",
          text: `Version ${version} is now the active version.`,
          confirmButtonText: "OK",
        });
      } catch (error) {
        console.error("Failed to set active version:", error);
        await Swal.fire({
          icon: "error",
          title: "Failed",
          text: "Failed to set active version. Please try again.",
          confirmButtonText: "OK",
        });
      }
    },
    [graphId],
  );

  return {
    latestVersion,
    isPublishing,
    handlePublish,
    handleRestoreVersion,
    handleDeleteVersion,
    handleSetActiveVersion,
  };
};
