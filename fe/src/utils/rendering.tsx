/**
 * Capitalizes the first letter of each word in a string
 */
export const capitalizeWords = (str: string): string => {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Renders data in a human-friendly format with proper hierarchy
 */
export const renderHumanFriendlyData = (
  data: any,
  depth: number = 0,
): JSX.Element[] => {
  const elements: JSX.Element[] = [];
  const paddingLeft = depth === 0 ? 0 : 18; // 18px per level
  const headingSize = Math.max(1, 4 - depth); // h1 to h4, then h4 for deeper levels

  if (typeof data === "object" && data !== null && !Array.isArray(data)) {
    Object.entries(data).forEach(([key, value], index) => {
      const HeadingTag =
        `h${Math.min(headingSize, 6)}` as keyof JSX.IntrinsicElements;

      elements.push(
        <div
          key={`${depth}-${key}-${index}`}
          className="mb-2"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          <HeadingTag className="font-bold text-gray-800 mt-4 first:mt-0">
            {capitalizeWords(key)}
          </HeadingTag>
          <div>
            {typeof value === "object" && value !== null ? (
              <div>{renderHumanFriendlyData(value, depth + 1)}</div>
            ) : Array.isArray(value) ? (
              <div>
                {value.map((item, i) => (
                  <div key={`${key}-item-${i}`} className="mb-2">
                    {typeof item === "object" && item !== null ? (
                      <div>
                        <div className="font-medium text-gray-600 mb-1">
                          Item {i + 1}:
                        </div>
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
        </div>,
      );
    });
  } else if (Array.isArray(data)) {
    data.forEach((item, index) => {
      elements.push(
        <div
          key={`array-${index}`}
          className="mb-1"
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {typeof item === "object" && item !== null ? (
            <div>
              <div className="font-medium text-gray-600 mb-1">
                Item {index + 1}:
              </div>
              {renderHumanFriendlyData(item, depth + 1)}
            </div>
          ) : (
            <div className="text-gray-700">• {String(item)}</div>
          )}
        </div>,
      );
    });
  } else {
    elements.push(
      <div
        key={`primitive-${depth}`}
        className="text-gray-700"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {String(data)}
      </div>,
    );
  }

  return elements;
};
