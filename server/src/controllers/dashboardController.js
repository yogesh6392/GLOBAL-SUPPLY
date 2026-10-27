import { asyncHandler } from "../utils/asyncHandler.js";

const roleTitles = {
  admin: "Platform overview",
  manufacturer: "Manufacturer dashboard",
  supplier: "Supplier dashboard",
  warehouse_manager: "Warehouse dashboard",
  logistics_provider: "Logistics dashboard"
};

export const getDashboard = asyncHandler(async (request, response) => {
  response.status(200).json({
    success: true,
    data: {
      title: roleTitles[request.user.role],
      role: request.user.role,
      organization: {
        id: request.user.organization.id,
        name: request.user.organization.name
      },
      dataStatus: "Operational records have not been added yet.",
      availableSections: ["organizations", "procurement", "inventory", "logistics", "analytics"]
    }
  });
});
