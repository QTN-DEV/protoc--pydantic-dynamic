import React, { createContext, useContext } from "react";
import { PydanticAttribute } from "@/types/pydantic";

interface PydanticFlowContextValue {
  addAttribute: (parentId: string, isNested?: boolean) => void;
  updateAttribute: (
    nodeId: string,
    field: keyof PydanticAttribute,
    value: any,
  ) => void;
  removeAttribute: (nodeId: string) => void;
  updateClassName: (name: string) => void;
  updateClassDescription: (description: string) => void;
}

const PydanticFlowContext = createContext<
  PydanticFlowContextValue | undefined
>(undefined);

export const PydanticFlowProvider: React.FC<{
  children: React.ReactNode;
  value: PydanticFlowContextValue;
}> = ({ children, value }) => {
  return (
    <PydanticFlowContext.Provider value={value}>
      {children}
    </PydanticFlowContext.Provider>
  );
};

export const usePydanticFlow = () => {
  const context = useContext(PydanticFlowContext);

  if (!context) {
    throw new Error(
      "usePydanticFlow must be used within PydanticFlowProvider",
    );
  }

  return context;
};
