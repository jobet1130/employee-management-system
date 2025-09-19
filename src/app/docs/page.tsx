import React from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

const ApiDocs = () => {
  return (
    <div className="w-full h-screen">
      <SwaggerUI url="/api/openapi.json" />
    </div>
  );
};

export default ApiDocs;
