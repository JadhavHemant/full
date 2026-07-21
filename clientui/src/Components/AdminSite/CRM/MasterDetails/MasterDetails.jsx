// import { useState, useEffect } from "react";
// import axios from "axios";
// import * as API from "../../../Endpoint/Endpoint";

// const MasterDetails = () => {
//   const [selectedSection, setSelectedSection] = useState(null);
//   const [taskTypes, setTaskTypes] = useState([]);
//   const [salesStages, setSalesStages] = useState([]);
//   const [productCategories, setProductCategories] = useState([]);
//   const [industries, setIndustries] = useState([]);
//   const [followupTypes, setFollowupTypes] = useState([]);
//   const [newTaskName, setNewTaskName] = useState("");
//   const [newTaskDuration, setNewTaskDuration] = useState(0);
//   const [editingTask, setEditingTask] = useState(null);

//   const fetchTaskTypes = async () => {
//     try {
//       const response = await axios.get(API.TASKTYPE);
//       setTaskTypes(response.data);
//     } catch (err) {
//       console.error("Error fetching task types:", err);
//     }
//   };

//   const fetchSalesStages = async () => {
//     try {
//       const response = await axios.get(API.SALESSTAGES);
//       setSalesStages(response.data);
//     } catch (err) {
//       console.error("Error fetching sales stages:", err);
//     }
//   };

//   const fetchProductCategories = async () => {
//     try {
//       const response = await axios.get(API.PRODUCTCATEGORIES);
//       setProductCategories(response.data);
//     } catch (err) {
//       console.error("Error fetching product categories:", err);
//     }
//   };

//   const fetchIndustries = async () => {
//     try {
//       const response = await axios.get(API.INDUSTRIES);
//       setIndustries(response.data);
//     } catch (err) {
//       console.error("Error fetching industries:", err);
//     }
//   };

//   const fetchFollowupTypes = async () => {
//     try {
//       const response = await axios.get(API.FOLLOWUPTYPES);
//       setFollowupTypes(response.data);
//     } catch (err) {
//       console.error("Error fetching follow-up types:", err);
//     }
//   };

//   const handleCreateTask = async () => {
//     try {
//       const newTask = { Name: newTaskName, DefaultDurationMinutes: newTaskDuration };
//       const response = await axios.post(API.POSTTASKTYPE, newTask);
//       setTaskTypes((prevTaskTypes) => [...prevTaskTypes, response.data]);
//       setNewTaskName("");
//       setNewTaskDuration(0);
//     } catch (err) {
//       console.error("Error creating task:", err);
//     }
//   };

//   const handleDeleteTask = async (id) => {
//     try {
//       await axios.delete(API.DELETETASKTYPE(id));
//       const updatedTaskTypes = taskTypes.filter((task) => task.Id !== id);
//       setTaskTypes(updatedTaskTypes);
//     } catch (err) {
//       console.error("Error deleting task:", err);
//     }
//   };

//   const handleEditTask = async (id) => {
//     const taskToEdit = taskTypes.find((task) => task.Id === id);
//     setEditingTask(taskToEdit);
//   };

//   const handleUpdateTask = async () => {
//     try {
//       const updatedTaskTypes = taskTypes.map((task) =>
//         task.Id === editingTask.Id ? editingTask : task
//       );
//       setTaskTypes(updatedTaskTypes);
//       setEditingTask(null);
//     } catch (err) {
//       console.error("Error updating task:", err);
//     }
//   };

//   useEffect(() => {
//     switch (selectedSection) {
//       case "taskMaster":
//         fetchTaskTypes();
//         break;
//       case "salesStages":
//         fetchSalesStages();
//         break;
//       case "productCategories":
//         fetchProductCategories();
//         break;
//       case "industries":
//         fetchIndustries();
//         break;
//       case "followupTypes":
//         fetchFollowupTypes();
//         break;
//       default:
//         break;
//     }
//   }, [selectedSection]);

//   return (
//     <>
//       <div className="mb-4">
//         <select
//           value={selectedSection}
//           onChange={(e) => setSelectedSection(e.target.value)}
//           className="bg-gray-700 text-white p-2 w-[250px] mt-4 rounded-2xl"
//         >
//           <option value={null}>Select Section</option>
//           <option value="taskMaster">Task Master</option>
//           <option value="salesStages">Sales Stages</option>
//           <option value="productCategories">Product Categories</option>
//           <option value="industries">Industries</option>
//           <option value="followupTypes">Follow-up Types</option>
//         </select>
//       </div>

//       {selectedSection === "taskMaster" && (
//         <div className="pt-2">
//           <h2>Task Master</h2>
//           <div className="p-1">
//             <input
//               type="text"
//               placeholder="Task Name"
//               value={newTaskName}
//               onChange={(e) => setNewTaskName(e.target.value)}
//               className="border rounded-xl"
//             />
//             <input
//               type="number"
//               placeholder="Duration (minutes)"
//               value={newTaskDuration}
//               onChange={(e) => setNewTaskDuration(Number(e.target.value))}
//               className="border rounded-xl"
//             />
//             <button onClick={handleCreateTask} className="bg-gray-700 border rounded-xl text-white p-2 mt-2">
//               Create Task
//             </button>
//           </div>
//           <div className="relative overflow-x-auto">
//             <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
//               <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
//                 <tr>
//                   <th scope="col" className="px-6 py-3">Task Name</th>
//                   <th scope="col" className="px-6 py-3">Duration</th>
//                   <th scope="col" className="px-6 py-3">Edit</th>
//                   <th scope="col" className="px-6 py-3">Delete</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {taskTypes.length > 0 ? (
//                   taskTypes.map((task) => (
//                     <tr key={task.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
//                       <td className="px-6 py-4">{task.Name}</td>
//                       <td className="px-6 py-4">{task.DefaultDurationMinutes}</td>
//                       <td className="px-6 py-4">
//                         <button className="text-blue-600 hover:text-blue-900" onClick={() => handleEditTask(task.Id)}>
//                           Edit
//                         </button>
//                       </td>
//                       <td className="px-6 py-4">
//                         <button className="text-red-600 hover:text-red-900" onClick={() => handleDeleteTask(task.Id)}>
//                           Delete
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr><td colSpan="4" className="text-center py-4">No task types available</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {selectedSection === "salesStages" && (
//         <div className="pt-2">
//           <h2>Sales Stages</h2>
//           <div className="relative overflow-x-auto">
//             <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
//               <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
//                 <tr>
//                   <th scope="col" className="px-6 py-3">Sales Stage Name</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {salesStages.length > 0 ? (
//                   salesStages.map((stage) => (
//                     <tr key={stage.Id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200">
//                       <td className="px-6 py-4">{stage.Name}</td>
//                     </tr>
//                   ))
//                 ) : (
//                   <tr><td colSpan="1" className="text-center py-4">No sales stages available</td></tr>
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </>
//   );
// };

// export default MasterDetails;



import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import * as API from "../../../Endpoint/Endpoint";
import axiosInstance from "../../utils/axiosInstance";

const toRows = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
};

const MasterDetails = () => {
  const [selectedSection, setSelectedSection] = useState("");
  const [taskTypes, setTaskTypes] = useState([]);
  const [salesStages, setSalesStages] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [followupTypes, setFollowupTypes] = useState([]);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(0);
  const [editingTask, setEditingTask] = useState(null);

  // ===================== FETCH FUNCTIONS =====================
  const fetchTaskTypes = async () => {
    try {
      const response = await axiosInstance.get(API.TASKTYPE);
      setTaskTypes(toRows(response.data));
    } catch (err) {
      console.error("Error fetching task types:", err);
      toast.error(err.response?.data?.message || "Failed to load task types");
    }
  };

  const fetchSalesStages = async () => {
    try {
      const response = await axiosInstance.get(API.SALESSTAGES);
      setSalesStages(toRows(response.data));
    } catch (err) {
      console.error("Error fetching sales stages:", err);
      toast.error(err.response?.data?.message || "Failed to load sales stages");
    }
  };

  const fetchProductCategories = async () => {
    try {
      const response = await axiosInstance.get(API.PRODUCTCATEGORIES);
      setProductCategories(toRows(response.data));
    } catch (err) {
      console.error("Error fetching product categories:", err);
      toast.error(err.response?.data?.message || "Failed to load product categories");
    }
  };

  const fetchIndustries = async () => {
    try {
      const response = await axiosInstance.get(API.INDUSTRIES);
      setIndustries(toRows(response.data));
    } catch (err) {
      console.error("Error fetching industries:", err);
      toast.error(err.response?.data?.message || "Failed to load industries");
    }
  };

  const fetchFollowupTypes = async () => {
    try {
      const response = await axiosInstance.get(API.FOLLOWUPTYPES);
      setFollowupTypes(toRows(response.data));
    } catch (err) {
      console.error("Error fetching follow-up types:", err);
      toast.error(err.response?.data?.message || "Failed to load follow-up types");
    }
  };

  // ===================== CRUD FUNCTIONS =====================
  const handleCreateTask = async () => {
    if (!newTaskName.trim()) {
      toast.error("Task name is required");
      return;
    }

    try {
      const newTask = { Name: newTaskName, DefaultDurationMinutes: newTaskDuration };
      const response = await axiosInstance.post(API.POSTTASKTYPE, newTask);
      setTaskTypes((prev) => [...prev, response.data]);
      setNewTaskName("");
      setNewTaskDuration(0);
      toast.success("Task type created successfully");
    } catch (err) {
      console.error("Error creating task:", err);
      toast.error(err.response?.data?.message || "Failed to create task type");
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await axiosInstance.delete(API.DELETETASKTYPE(id));
      setTaskTypes((prev) => prev.filter((task) => task.Id !== id));
      toast.success("Task type deleted successfully");
    } catch (err) {
      console.error("Error deleting task:", err);
      toast.error(err.response?.data?.message || "Failed to delete task type");
    }
  };

  // const handleEditTask = (id) => {
  //   const taskToEdit = taskTypes.find((task) => task.Id === id);
  //   setEditingTask(taskToEdit);
  // };

  const handleUpdateTask = async () => {
    try {
      const updatedTaskTypes = taskTypes.map((task) =>
        task.Id === editingTask.Id ? editingTask : task
      );
      setTaskTypes(updatedTaskTypes);
      setEditingTask(null);
      toast.success("Task type updated successfully");
    } catch (err) {
      console.error("Error updating task:", err);
      toast.error(err.response?.data?.message || "Failed to update task type");
    }
  };

  // ===================== FETCH ON SELECTION =====================
  useEffect(() => {
    if (!selectedSection) return;

    switch (selectedSection) {
      case "taskMaster":
        fetchTaskTypes();
        break;
      case "salesStages":
        fetchSalesStages();
        break;
      case "productCategories":
        fetchProductCategories();
        break;
      case "industries":
        fetchIndustries();
        break;
      case "followupTypes":
        fetchFollowupTypes();
        break;
      default:
        break;
    }
  }, [selectedSection]);

  return (
    <>
      <div className="mb-4">
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="bg-gray-700 text-white p-2 w-[250px] mt-4 rounded-2xl"
        >
          <option value="">Select Section</option>
          <option value="taskMaster">Task Master</option>
          <option value="salesStages">Sales Stages</option>
          <option value="productCategories">Product Categories</option>
          <option value="industries">Industries</option>
          <option value="followupTypes">Follow-up Types</option>
        </select>
      </div>

      {selectedSection === "taskMaster" && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-2">Task Master</h2>

          <div className="p-2 flex gap-2 flex-wrap">
            <input
              type="text"
              placeholder="Task Name"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              className="border rounded-xl p-2"
            />
            <input
              type="number"
              placeholder="Duration (minutes)"
              value={newTaskDuration}
              onChange={(e) => setNewTaskDuration(Number(e.target.value))}
              className="border rounded-xl p-2"
            />
            <button
              onClick={handleCreateTask}
              className="bg-gray-700 border rounded-xl text-white px-4 py-2 hover:bg-gray-600 transition"
            >
              Create Task
            </button>
          </div>

          <div className="relative overflow-x-auto mt-4">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Task Name</th>
                  <th className="px-6 py-3">Duration</th>
                  <th className="px-6 py-3">Edit</th>
                  <th className="px-6 py-3">Delete</th>
                </tr>
              </thead>
              <tbody>
                {taskTypes.length > 0 ? (
                  taskTypes.map((task) => (
                    <tr
                      key={task.Id}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                    >
                      <td className="px-6 py-4">{task.Name}</td>
                      <td className="px-6 py-4">{task.DefaultDurationMinutes}</td>
                      <td className="px-6 py-4">
                        <button
                          className="text-blue-600 hover:text-blue-900"
                          onClick={() => handleUpdateTask(task.Id)}
                        >
                          Edit
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="text-red-600 hover:text-red-900"
                          onClick={() => handleDeleteTask(task.Id)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center py-4">
                      No task types available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedSection === "salesStages" && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-2">Sales Stages</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Sales Stage Name</th>
                </tr>
              </thead>
              <tbody>
                {salesStages.length > 0 ? (
                  salesStages.map((stage) => (
                    <tr
                      key={stage.Id}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                    >
                      <td className="px-6 py-4">{stage.Name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center py-4">No sales stages available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedSection === "productCategories" && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-2">Product Categories</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Category Name</th>
                </tr>
              </thead>
              <tbody>
                {productCategories.length > 0 ? (
                  productCategories.map((category) => (
                    <tr
                      key={category.Id}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                    >
                      <td className="px-6 py-4">{category.Name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center py-4">
                      No product categories available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedSection === "industries" && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-2">Industries</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Industry Name</th>
                </tr>
              </thead>
              <tbody>
                {industries.length > 0 ? (
                  industries.map((ind) => (
                    <tr
                      key={ind.Id}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                    >
                      <td className="px-6 py-4">{ind.Name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center py-4">No industries available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {selectedSection === "followupTypes" && (
        <div className="pt-2">
          <h2 className="text-lg font-semibold mb-2">Follow-up Types</h2>
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Follow-up Type Name</th>
                </tr>
              </thead>
              <tbody>
                {followupTypes.length > 0 ? (
                  followupTypes.map((type) => (
                    <tr
                      key={type.Id}
                      className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 border-gray-200"
                    >
                      <td className="px-6 py-4">{type.Name}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="text-center py-4">No follow-up types available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default MasterDetails;
