
import { useState } from 'react';
import DefaultLayout from "@/layouts/default";
import PydanticForm from "@/components/PydanticForm";
import { apiService } from "@/services/api";
import { PydanticClassRequest, GenerateResponse } from "@/types/pydantic";

export default function IndexPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleFormSubmit = async (data: PydanticClassRequest): Promise<GenerateResponse> => {
    setIsLoading(true);
    try {
      const response = await apiService.generatePydantic(data);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DefaultLayout>
      <PydanticForm onSubmit={handleFormSubmit} isLoading={isLoading} />
    </DefaultLayout>
  );
}
