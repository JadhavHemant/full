import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import toast, { Toaster } from "react-hot-toast";
import {
  ArrowPathIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { getUserFromToken } from "../../../Components/AdminSite/utils/tokenUtils";
import { getSessionUser, SUPER_ADMIN_ROLE_ID } from "../../../utils/sessionUser";
import { usePortalAccess } from "../../../utils/portalAccess";
import { loadUserOptions } from "../services/optionsService";
import TitleBar from "../../../Components/TitleBar";

const ADMIN_ONLY_FIELD_NAMES = new Set(["IsActive", "IsDeleted", "Flag"]);
const BULK_EDIT_FIELD_NAMES = ["Status", "AssignedTo", "IsActive"];

const actionToneClasses = {
  success: "text-green-500 hover:text-green-700",
  danger: "text-red-500 hover:text-red-700",
  warning: "text-orange-500 hover:text-orange-700",
  info: "text-blue-500 hover:text-blue-700",
};

const isCurrentUserSuperAdmin = () => {
  try {
    const cookieUser = Cookies.get("user");
    if (cookieUser) {
      const parsedUser = JSON.parse(cookieUser);
      if (Number(parsedUser?.roleId ?? parsedUser?.RoleId) === SUPER_ADMIN_ROLE_ID) {
        return true;
      }
    }
  } catch {
    // Ignore malformed cookie and fall back to token.
  }

  const tokenUser = getUserFromToken();
  return Number(tokenUser?.roleId ?? tokenUser?.RoleId) === SUPER_ADMIN_ROLE_ID;
};

const isEmpty = (value) => value === "" || value === null || value === undefined;
const SINGLE_COMPANY_FIELD_NAMES = new Set(["CompanyId"]);
const DEFAULT_TABLE_COLUMN_COUNT = 4;
const DEFAULT_PAGE_SIZE = 100;
const AUDIT_FIELD_NAMES = new Set(["CreatedBy", "UpdatedBy", "CreatedAt", "UpdatedAt"]);
const COLUMN_FILTER_PARAM = "columnFilters";

const humanizeFieldLabel = (name) => {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .replace(/Id$/i, " ID")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
};

const getFieldLabel = (field) => field?.label || humanizeFieldLabel(field?.name);

const areShallowEqualObjects = (left, right) => {
  if (left === right) {
    return true;
  }

  const leftKeys = Object.keys(left || {});
  const rightKeys = Object.keys(right || {});

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => left[key] === right[key]);
};

const areEqualArrays = (left, right) => {
  if (left === right) {
    return true;
  }

  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => value === right[index]);
};

const emptyForFields = (fields) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.type === "checkbox" ? Boolean(field.defaultValue) : field.defaultValue ?? "";
    return acc;
  }, {});

const clampNumber = (value, min, max) => {
  let nextValue = value;
  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }
  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }
  return nextValue;
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
};

const formatHistoryLabel = (entry) => {
  if (entry?.action) {
    return String(entry.action).replace(/_/g, " ");
  }

  if (entry?.EventType) {
    const eventName = String(entry.EventType).split(".").pop();
    return eventName.replace(/_/g, " ");
  }

  return "update";
};

const normalizeValue = (field, value) => {
  if (field.type === "number") {
    if (isEmpty(value)) {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : clampNumber(parsed, field.min, field.max);
  }

  if (field.type === "select") {
    if (isEmpty(value)) {
      return null;
    }

    if (typeof value === "string" && /^-?\d+(\.\d+)?$/.test(value.trim())) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? value : parsed;
    }

    return value;
  }

  if (field.type === "checkbox") {
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }

    return Boolean(value);
  }

  return value === "" ? null : value;
};

const emptyActionValues = (fields = []) =>
  fields.reduce((acc, field) => {
    acc[field.name] = field.type === "checkbox" ? Boolean(field.defaultValue) : field.defaultValue ?? "";
    return acc;
  }, {});

const CrmWorkspace = ({
  title,
  description,
  fields,
  service,
  searchPlaceholder,
  primaryField,
  filters = [],
  rowActions = [],
  defaultQueryParams = {},
  defaultTableFieldNames = [],
  defaultSortBy = "",
  defaultSortOrder = "DESC",
}) => {
  const { canManageRestrictedActions, isUserPortal } = usePortalAccess();
  const location = useLocation();
  const navigate = useNavigate();
  const isSuperAdmin = useMemo(() => isCurrentUserSuperAdmin(), []);
  const sessionUser = useMemo(() => getSessionUser() || {}, []);
  const sessionCompanyId = useMemo(
    () => Number(sessionUser.companyId || sessionUser.CompanyId) || null,
    [sessionUser]
  );

  const normalizedFields = useMemo(() => {
    const validFields = Array.isArray(fields)
      ? fields.filter((field) => field && typeof field.name === "string" && field.name.trim())
      : [];

    validFields.forEach((field) => {
      if (!field.label && field.name) {
        field.label = humanizeFieldLabel(field.name);
      }
    });

    const fieldMap = new Map(validFields.map((field) => [field.name, field]));
    const auditFields = [
      {
        name: "CreatedBy",
        label: "Created by",
        type: "select",
        loadOptions: loadUserOptions,
        displayKey: "CreatedByName",
        submit: false,
        readOnly: true,
        viewOnly: true,
      },
      {
        name: "UpdatedBy",
        label: "Modified by",
        type: "select",
        loadOptions: loadUserOptions,
        displayKey: "UpdatedByName",
        submit: false,
        readOnly: true,
        viewOnly: true,
      },
      {
        name: "CreatedAt",
        label: "Created on",
        submit: false,
        readOnly: true,
        viewOnly: true,
        renderCell: (value) => formatDateTime(value),
      },
      {
        name: "UpdatedAt",
        label: "Modified on",
        submit: false,
        readOnly: true,
        viewOnly: true,
        renderCell: (value) => formatDateTime(value),
      },
    ];

    auditFields.forEach((field) => {
      if (!fieldMap.has(field.name)) {
        fieldMap.set(field.name, field);
      }
    });

    return Array.from(fieldMap.values());
  }, [fields]);

  const visibleFields = useMemo(
    () =>
      normalizedFields.filter((field) => {
        if (SINGLE_COMPANY_FIELD_NAMES.has(field.name)) {
          return false;
        }
        return isSuperAdmin || field.userVisible || !ADMIN_ONLY_FIELD_NAMES.has(field.name);
      }),
    [normalizedFields, isSuperAdmin]
  );

  const primaryFieldConfig = useMemo(
    () => visibleFields.find((field) => field.name === primaryField),
    [visibleFields, primaryField]
  );

  const selectableTableFields = useMemo(
    () => visibleFields.filter((field) => field.name !== primaryField && !field.tableHidden),
    [visibleFields, primaryField]
  );

  const columnStorageKey = useMemo(
    () => `crm-visible-columns-${title.toLowerCase().replace(/\s+/g, "-")}`,
    [title]
  );

  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedTableFieldNames, setSelectedTableFieldNames] = useState([]);
  const fallbackTableFieldNames = useMemo(() => {
    const requestedDefaultFields = defaultTableFieldNames.filter((name) =>
      selectableTableFields.some((field) => field.name === name)
    );

    if (requestedDefaultFields.length) {
      return requestedDefaultFields;
    }

    return selectableTableFields.slice(0, DEFAULT_TABLE_COLUMN_COUNT).map((field) => field.name);
  }, [defaultTableFieldNames, selectableTableFields]);

  const tableFields = useMemo(() => {
    const selectedSet = new Set(selectedTableFieldNames);
    const selectedFields = selectableTableFields.filter((field) => selectedSet.has(field.name));

    if (selectedFields.length) {
      return selectedFields;
    }

    return selectableTableFields.filter((field) => fallbackTableFieldNames.includes(field.name));
  }, [selectableTableFields, selectedTableFieldNames, fallbackTableFieldNames]);

  const sortableFields = useMemo(() => {
    const source = visibleFields.filter((field) => field.type !== "checkbox" && !field.tableHidden);
    if (!source.find((field) => field.name === primaryField) && primaryFieldConfig) {
      return [primaryFieldConfig, ...source];
    }
    return source;
  }, [visibleFields, primaryField, primaryFieldConfig]);

  const initialForm = useMemo(() => emptyForFields(visibleFields), [visibleFields]);

  const initialFilterState = useMemo(
    () =>
      filters.reduce((acc, filter) => {
        acc[filter.name] = filter.defaultValue ?? "";
        return acc;
      }, {}),
    [filters]
  );

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoadingKey, setActionLoadingKey] = useState("");
  const [fieldOptions, setFieldOptions] = useState({});
  const [filterOptions, setFilterOptions] = useState({});

  const [pagination, setPagination] = useState({
    total: 0,
    limit: DEFAULT_PAGE_SIZE,
    offset: 0,
    totalPages: 1,
    currentPage: 1,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterState, setFilterState] = useState(initialFilterState);
  const [columnFilters, setColumnFilters] = useState({});
  const [sortBy, setSortBy] = useState(defaultSortBy || primaryField || "");
  const [sortOrder, setSortOrder] = useState(defaultSortOrder || "DESC");

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});
  const [activeAction, setActiveAction] = useState(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionFormData, setActionFormData] = useState({});
  const [actionFormErrors, setActionFormErrors] = useState({});
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [bulkUpdateValues, setBulkUpdateValues] = useState({});
  const [comments, setComments] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const derivedFields = useMemo(
    () => visibleFields.filter((field) => typeof field.deriveValue === "function"),
    [visibleFields]
  );
  const bulkEditableFields = useMemo(
    () => visibleFields.filter((field) => BULK_EDIT_FIELD_NAMES.includes(field.name)),
    [visibleFields]
  );
  const selectedRows = useMemo(
    () => rows.filter((row) => selectedRowIds.includes(row.Id)),
    [rows, selectedRowIds]
  );
  const openRecordId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const value = Number.parseInt(params.get("openId") || "", 10);
    return Number.isFinite(value) ? value : null;
  }, [location.search]);
  const filterConfigSignature = useMemo(
    () =>
      JSON.stringify(
        filters.map((filter) => ({
          name: filter.name,
          type: filter.type,
          defaultValue: filter.defaultValue ?? "",
          optionValues: Array.isArray(filter.options)
            ? filter.options.map((option) => `${option?.value ?? ""}:${option?.label ?? ""}`)
            : [],
          hasLoader: typeof filter.loadOptions === "function",
        }))
      ),
    [filters]
  );
  const fieldLoaderSignature = useMemo(
    () =>
      JSON.stringify(
        visibleFields
          .filter((field) => field.type === "select" && typeof field.loadOptions === "function")
          .map((field) => field.name)
      ),
    [visibleFields]
  );
  const filterLoaderSignature = useMemo(
    () =>
      JSON.stringify(
        filters
          .filter((filter) => filter.type === "select" && typeof filter.loadOptions === "function")
          .map((filter) => filter.name)
      ),
    [filters]
  );
  const defaultQueryParamsSignature = useMemo(
    () => JSON.stringify(defaultQueryParams || {}),
    [defaultQueryParams]
  );
  const columnFiltersSignature = useMemo(() => JSON.stringify(columnFilters), [columnFilters]);

  useEffect(() => {
    setFilterState((prev) => (areShallowEqualObjects(prev, initialFilterState) ? prev : initialFilterState));
  }, [filterConfigSignature]);

  useEffect(() => {
    const updateSelectedTableFields = (nextFieldNames) => {
      setSelectedTableFieldNames((prev) => (areEqualArrays(prev, nextFieldNames) ? prev : nextFieldNames));
    };

    try {
      const saved = window.localStorage.getItem(columnStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const allowed = parsed.filter((name) => selectableTableFields.some((field) => field.name === name));
          updateSelectedTableFields(allowed.length ? allowed : fallbackTableFieldNames);
          return;
        }
      }
    } catch {
      // Ignore bad local storage data.
    }

    updateSelectedTableFields(fallbackTableFieldNames);
  }, [columnStorageKey, selectableTableFields, fallbackTableFieldNames]);

  useEffect(() => {
    if (!selectedTableFieldNames.length) {
      return;
    }

    window.localStorage.setItem(columnStorageKey, JSON.stringify(selectedTableFieldNames));
  }, [columnStorageKey, selectedTableFieldNames]);

  useEffect(() => {
    if (!sortableFields.length) {
      setSortBy(defaultSortBy || primaryField || "");
      return;
    }

    if (!sortableFields.find((field) => field.name === sortBy)) {
      setSortBy(defaultSortBy && sortableFields.find((field) => field.name === defaultSortBy)
        ? defaultSortBy
        : sortableFields[0].name);
    }
  }, [sortableFields, sortBy, primaryField, defaultSortBy]);

  const fetchRows = useCallback(
    async (limit = DEFAULT_PAGE_SIZE, offset = 0) => {
      setLoading(true);
      try {
        const params = {
          limit,
          offset,
          search: debouncedSearch,
          sortBy,
          sortOrder,
          ...defaultQueryParams,
        };

        Object.entries(filterState).forEach(([key, value]) => {
          if (!isEmpty(value)) {
            params[key] = value;
          }
        });

        const activeColumnFilters = Object.entries(columnFilters).reduce((acc, [key, value]) => {
          if (!isEmpty(value)) {
            acc[key] = value;
          }
          return acc;
        }, {});

        if (Object.keys(activeColumnFilters).length) {
          params[COLUMN_FILTER_PARAM] = JSON.stringify(activeColumnFilters);
        }

        const response = await service.list(params);
        const data = response?.data || [];
        const paginationData = response?.pagination || {};
        const total = paginationData.total ?? data.length;
        const nextLimit = paginationData.limit ?? limit;
        const nextOffset = paginationData.offset ?? offset;
        const totalPages = Math.max(1, Math.ceil(total / Math.max(1, nextLimit)));
        const currentPage = Math.floor(nextOffset / Math.max(1, nextLimit)) + 1;

        setRows(data);
        setPagination({
          total,
          limit: nextLimit,
          offset: nextOffset,
          totalPages,
          currentPage,
        });
      } catch (error) {
        toast.error(error.response?.data?.message || `Unable to load ${title.toLowerCase()}`);
      } finally {
        setLoading(false);
      }
    },
    [
      service,
      debouncedSearch,
      filterState,
      columnFiltersSignature,
      sortBy,
      sortOrder,
      title,
      defaultQueryParamsSignature,
    ]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const reloadOptions = useCallback(async () => {
    const fieldPromises = visibleFields
      .filter((field) => field.type === "select" && typeof field.loadOptions === "function")
      .map(async (field) => {
        try {
          const options = await field.loadOptions();
          return [field.name, options];
        } catch {
          toast.error(`Unable to load ${field.label.toLowerCase()} options`);
          return [field.name, []];
        }
      });

    const filterPromises = filters
      .filter((filter) => filter.type === "select" && typeof filter.loadOptions === "function")
      .map(async (filter) => {
        try {
          const options = await filter.loadOptions();
          return [filter.name, options];
        } catch {
          toast.error(`Unable to load ${filter.label.toLowerCase()} filters`);
          return [filter.name, []];
        }
      });

    const [loadedFields, loadedFilters] = await Promise.all([
      Promise.all(fieldPromises),
      Promise.all(filterPromises),
    ]);

    setFieldOptions(Object.fromEntries(loadedFields));
    setFilterOptions(Object.fromEntries(loadedFilters));
  }, [visibleFields, filters]);

  useEffect(() => {
    let isCancelled = false;

    const loadOptions = async () => {
      const fieldPromises = visibleFields
        .filter((field) => field.type === "select" && typeof field.loadOptions === "function")
        .map(async (field) => {
          try {
            const options = await field.loadOptions();
            return [field.name, options];
          } catch {
            toast.error(`Unable to load ${field.label.toLowerCase()} options`);
            return [field.name, []];
          }
        });

      const filterPromises = filters
        .filter((filter) => filter.type === "select" && typeof filter.loadOptions === "function")
        .map(async (filter) => {
          try {
            const options = await filter.loadOptions();
            return [filter.name, options];
          } catch {
            toast.error(`Unable to load ${filter.label.toLowerCase()} filters`);
            return [filter.name, []];
          }
        });

      const [loadedFields, loadedFilters] = await Promise.all([
        Promise.all(fieldPromises),
        Promise.all(filterPromises),
      ]);

      if (isCancelled) {
        return;
      }

      setFieldOptions(Object.fromEntries(loadedFields));
      setFilterOptions(Object.fromEntries(loadedFilters));
    };

    loadOptions();

    return () => {
      isCancelled = true;
    };
  }, [fieldLoaderSignature, filterLoaderSignature]);

  useEffect(() => {
    fetchRows(pagination.limit, 0);
  }, [debouncedSearch, filterState, columnFiltersSignature, sortBy, sortOrder, pagination.limit, fetchRows]);

  useEffect(() => {
    setSelectedRowIds((prev) => prev.filter((rowId) => rows.some((row) => row.Id === rowId)));
  }, [rows]);

  useEffect(() => {
    setBulkUpdateValues((prev) =>
      bulkEditableFields.reduce((acc, field) => {
        acc[field.name] = prev[field.name] ?? "";
        return acc;
      }, {})
    );
  }, [bulkEditableFields]);

  useEffect(() => {
    if (!showModal || !derivedFields.length) {
      return;
    }

    setFormData((prev) => {
      let hasChanges = false;
      const nextForm = { ...prev };

      derivedFields.forEach((field) => {
        const nextValue =
          field.deriveValue({
            formData: nextForm,
            selectedRow,
            fieldOptions,
            modalMode,
          }) ?? "";

        if ((nextForm[field.name] ?? "") !== nextValue) {
          nextForm[field.name] = nextValue;
          hasChanges = true;
        }
      });

      return hasChanges ? nextForm : prev;
    });
  }, [showModal, derivedFields, selectedRow, fieldOptions, modalMode]);

  useEffect(() => {
    if (!showModal || !selectedRow?.Id) {
      setComments([]);
      setHistoryItems([]);
      setNewComment("");
      return;
    }

    let isCancelled = false;

    const loadActivity = async () => {
      setCommentsLoading(true);
      setHistoryLoading(true);

      try {
        const [commentsResponse, historyResponse] = await Promise.all([
          service.listComments(selectedRow.Id),
          service.listHistory(selectedRow.Id),
        ]);

        if (isCancelled) {
          return;
        }

        setComments(commentsResponse?.data || []);
        setHistoryItems(historyResponse?.data || []);
      } catch (error) {
        if (!isCancelled) {
          toast.error(error.response?.data?.message || "Unable to load record activity");
        }
      } finally {
        if (!isCancelled) {
          setCommentsLoading(false);
          setHistoryLoading(false);
        }
      }
    };

    loadActivity();

    return () => {
      isCancelled = true;
    };
  }, [showModal, selectedRow, service]);

  const resetForm = () => {
    setFormData(initialForm);
    setFormErrors({});
    setSelectedRow(null);
    setModalMode("create");
  };

  const openCreateModal = () => {
    setFormData(initialForm);
    setFormErrors({});
    setSelectedRow(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEditModal = (row) => {
    const nextForm = visibleFields.reduce((acc, field) => {
      acc[field.name] = row[field.name] ?? (field.type === "checkbox" ? false : field.defaultValue ?? "");
      return acc;
    }, {});

    setSelectedRow(row);
    setFormData(nextForm);
    setFormErrors({});
    setModalMode("edit");
    setShowModal(true);
  };

  const openViewModal = (row) => {
    const nextForm = visibleFields.reduce((acc, field) => {
      acc[field.name] = row[field.name] ?? (field.type === "checkbox" ? false : field.defaultValue ?? "");
      return acc;
    }, {});

    setSelectedRow(row);
    setFormData(nextForm);
    setFormErrors({});
    setModalMode("view");
    setShowModal(true);
  };

  useEffect(() => {
    let isCancelled = false;

    const openRecordFromNotification = async () => {
      if (!openRecordId || showModal) {
        return;
      }

      const existingRow = rows.find((row) => Number(row.Id) === Number(openRecordId));
      if (existingRow) {
        openViewModal(existingRow);
        return;
      }

      try {
        const response = await service.getById(openRecordId);
        const row = response?.data || response;
        if (!isCancelled && row?.Id) {
          openViewModal(row);
        }
      } catch {
        if (!isCancelled) {
          toast.error(`Unable to open ${title.replace(/s$/, "").toLowerCase()} details`);
        }
      } finally {
        if (!isCancelled) {
          const nextParams = new URLSearchParams(location.search);
          nextParams.delete("openId");
          const nextSearch = nextParams.toString();
          navigate(
            {
              pathname: location.pathname,
              search: nextSearch ? `?${nextSearch}` : "",
            },
            { replace: true }
          );
        }
      }
    };

    openRecordFromNotification();

    return () => {
      isCancelled = true;
    };
  }, [openRecordId, rows, showModal, service, title, navigate, location.pathname, location.search]);

  const validateForm = () => {
    const errors = {};

    visibleFields.forEach((field) => {
      if (field.createOnly && modalMode !== "create") {
        return;
      }

      if (field.required && isEmpty(formData[field.name])) {
        errors[field.name] = `${field.label} is required`;
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field.name]: value }));
    if (formErrors[field.name]) {
      setFormErrors((prev) => ({ ...prev, [field.name]: "" }));
    }
  };

  const handleColumnFilterChange = (fieldName, value) => {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (isEmpty(value)) {
        delete next[fieldName];
      } else {
        next[fieldName] = value;
      }
      return next;
    });
  };

  const getDisplayValue = (field, value, row = null) => {
    if (isEmpty(value)) {
      if (field?.displayKey && row?.[field.displayKey]) {
        return String(row[field.displayKey]);
      }
      return "-";
    }

    if (!field) {
      return String(value);
    }

    if (field.type === "checkbox") {
      return value ? "Yes" : "No";
    }

    if (field.type === "select") {
      if (field.displayKey && row?.[field.displayKey]) {
        return String(row[field.displayKey]);
      }

      const options = field.loadOptions ? fieldOptions[field.name] || [] : field.options || [];
      const selected = options.find((option) => String(option.value) === String(value));
      return selected?.label || String(value);
    }

    if (AUDIT_FIELD_NAMES.has(field.name) || field.type === "date" || field.type === "datetime-local") {
      return formatDateTime(value);
    }

    return String(value);
  };

  const renderTableValue = (field, row) => {
    const value = row[field.name];

    if (typeof field.renderCell === "function") {
      return field.renderCell(value, row);
    }

    return getDisplayValue(field, value, row);
  };

  const renderColumnFilter = (field) => {
    const value = columnFilters[field.name] ?? "";
    const options = field.loadOptions ? fieldOptions[field.name] || [] : field.options || [];
    const controlClass =
      "mt-2 block w-full rounded border border-blueGray-100 bg-white px-2 py-1 text-[11px] font-normal normal-case text-blueGray-600 shadow-sm focus:outline-none focus:ring";

    if (field.type === "checkbox") {
      return (
        <select
          value={value}
          onChange={(event) => handleColumnFilterChange(field.name, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className={controlClass}
          aria-label={`Filter ${field.label}`}
        >
          <option value="">All</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (field.type === "select" && options.length) {
      return (
        <select
          value={value}
          onChange={(event) => handleColumnFilterChange(field.name, event.target.value)}
          onClick={(event) => event.stopPropagation()}
          className={controlClass}
          aria-label={`Filter ${field.label}`}
        >
          <option value="">All</option>
          {options.map((option) => (
            <option key={`column-filter-${field.name}-${option.value}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value}
        onChange={(event) => handleColumnFilterChange(field.name, event.target.value)}
        onClick={(event) => event.stopPropagation()}
        className={controlClass}
        placeholder="Filter"
        aria-label={`Filter ${field.label}`}
      />
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (modalMode === "view") {
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }

    const payload = visibleFields.reduce((acc, field) => {
      if (field.createOnly && modalMode !== "create") {
        return acc;
      }

      if (field.submit === false) {
        return acc;
      }

      acc[field.name] = normalizeValue(field, formData[field.name]);
      return acc;
    }, {});

    if (sessionCompanyId) {
      payload.CompanyId = sessionCompanyId;
    }

    setSubmitting(true);
    try {
      if (modalMode === "edit" && selectedRow?.Id) {
        await service.update(selectedRow.Id, payload);
        toast.success(`${title} updated successfully`);
      } else {
        await service.create(payload);
        toast.success(`${title} created successfully`);
        setPagination((prev) => ({ ...prev, offset: 0, currentPage: 1 }));
      }

      setShowModal(false);
      resetForm();
      await fetchRows(pagination.limit, modalMode === "create" ? 0 : pagination.offset);
      await reloadOptions();
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to save ${title.toLowerCase()}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRow?.Id) {
      return;
    }

    setDeleting(true);
    try {
      await service.remove(selectedRow.Id);
      toast.success(`${title} deleted successfully`);
      setShowDeleteModal(false);
      setShowModal(false);
      resetForm();
      await fetchRows(pagination.limit, pagination.offset);
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to delete ${title.toLowerCase()}`);
    } finally {
      setDeleting(false);
    }
  };

  const executeCustomRowAction = async ({ action, row, payload }) => {
    setActionLoadingKey(`${row.Id}-${action.label}`);
    try {
      const updatedRecord = action.endpoint
        ? await service.runAction(row.Id, {
            method: action.method || "post",
            path: action.endpoint,
            payload,
            params: typeof action.getParams === "function" ? action.getParams(row) : action.params,
          })
        : await service.update(row.Id, payload);
      toast.success(action.successMessage || `${action.label} completed`);

      const nextPath = typeof action.getSuccessNavigation === "function"
        ? action.getSuccessNavigation({
            row,
            payload,
            updatedRecord,
            isUserPortal,
          })
        : null;

      setShowActionModal(false);
      setActiveAction(null);
      setActionFormData({});
      setActionFormErrors({});

      if (nextPath) {
        navigate(nextPath);
        return;
      }

      await fetchRows(pagination.limit, pagination.offset);
      await reloadOptions();
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to apply ${action.label.toLowerCase()}`);
    } finally {
      setActionLoadingKey("");
    }
  };

  const validateActionForm = (action, values, row) => {
    const errors = {};
    const actionFields = Array.isArray(action?.fields) ? action.fields : [];

    actionFields.forEach((field) => {
      const value = values?.[field.name];
      if (field.required && isEmpty(value)) {
        errors[field.name] = `${getFieldLabel(field)} is required`;
      }
    });

    if (typeof action?.validate === "function") {
      const customErrors = action.validate(values || {}, row) || {};
      Object.assign(errors, customErrors);
    }

    setActionFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCustomRowAction = async (action, row) => {
    const actionFields = Array.isArray(action.fields) ? action.fields : [];

    if (actionFields.length) {
      const initialActionValues = emptyActionValues(actionFields);
      const presetValues = typeof action.getInitialValues === "function" ? action.getInitialValues(row) : {};
      setSelectedRow(row);
      setActiveAction(action);
      setActionFormData({ ...initialActionValues, ...(presetValues || {}) });
      setActionFormErrors({});
      setShowActionModal(true);
      return;
    }

    const confirmMessage = typeof action.confirmMessage === "function"
      ? action.confirmMessage(row)
      : action.confirmMessage;

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    const payload = typeof action.getPayload === "function" ? action.getPayload(row) : null;
    if (!payload || typeof payload !== "object") {
      toast.error("Invalid action payload");
      return;
    }

    await executeCustomRowAction({ action, row, payload });
  };

  const handleActionFieldChange = (field, value) => {
    setActionFormData((prev) => ({
      ...prev,
      [field.name]: normalizeValue(field, value),
    }));

    if (actionFormErrors[field.name]) {
      setActionFormErrors((prev) => ({ ...prev, [field.name]: "" }));
    }
  };

  const handleActionSubmit = async (event) => {
    event.preventDefault();
    if (!activeAction || !selectedRow) {
      return;
    }

    if (!validateActionForm(activeAction, actionFormData, selectedRow)) {
      toast.error("Please fix action validation errors");
      return;
    }

    const payload = typeof activeAction.getPayload === "function"
      ? activeAction.getPayload(selectedRow, actionFormData)
      : actionFormData;

    if (!payload || typeof payload !== "object") {
      toast.error("Invalid action payload");
      return;
    }

    await executeCustomRowAction({ action: activeAction, row: selectedRow, payload });
  };

  const handlePageChange = (newPage) => {
    const newOffset = (newPage - 1) * pagination.limit;
    fetchRows(pagination.limit, newOffset);
  };

  const toggleRowSelection = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((selectedId) => selectedId !== rowId) : [...prev, rowId]
    );
  };

  const toggleSelectAllRows = () => {
    if (selectedRows.length === rows.length && rows.length > 0) {
      setSelectedRowIds([]);
      return;
    }

    setSelectedRowIds(rows.map((row) => row.Id));
  };

  const clearSelectedRows = () => {
    setSelectedRowIds([]);
    setBulkUpdateValues(
      bulkEditableFields.reduce((acc, field) => {
        acc[field.name] = "";
        return acc;
      }, {})
    );
  };

  const handleBulkUpdate = async () => {
    if (!selectedRows.length) {
      toast.error("Select at least one record");
      return;
    }

    const payload = bulkEditableFields.reduce((acc, field) => {
      const value = bulkUpdateValues[field.name];
      if (!isEmpty(value)) {
        acc[field.name] = normalizeValue(field, value);
      }
      return acc;
    }, {});

    if (!Object.keys(payload).length) {
      toast.error("Choose a status, assignee, or active state first");
      return;
    }

    setActionLoadingKey("bulk-update");
    try {
      await Promise.all(selectedRows.map((row) => service.update(row.Id, payload)));
      toast.success(`${selectedRows.length} record${selectedRows.length > 1 ? "s" : ""} updated`);
      clearSelectedRows();
      await fetchRows(pagination.limit, pagination.offset);
    } catch (error) {
      toast.error(error.response?.data?.message || `Unable to update selected ${title.toLowerCase()}`);
    } finally {
      setActionLoadingKey("");
    }
  };

  const handleAddComment = async () => {
    if (!selectedRow?.Id) {
      return;
    }

    const commentText = newComment.trim();
    if (!commentText) {
      toast.error("Write a comment first");
      return;
    }

    setCommentSubmitting(true);
    try {
      const createdComment = await service.addComment(selectedRow.Id, commentText);
      setComments((prev) => [createdComment, ...prev]);
      setNewComment("");

      const historyResponse = await service.listHistory(selectedRow.Id);
      setHistoryItems(historyResponse?.data || []);
      toast.success("Comment added");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to add comment");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleLimitChange = (newLimit) => {
    fetchRows(newLimit, 0);
  };

  const clearFilters = () => {
    setFilterState(initialFilterState);
    setColumnFilters({});
    setSearchTerm("");
    setDebouncedSearch("");
    setSortBy(defaultSortBy || sortableFields[0]?.name || primaryField || "");
    setSortOrder(defaultSortOrder || "DESC");
    setPagination((prev) => ({ ...prev, offset: 0, currentPage: 1 }));
  };

  const handleColumnToggle = (fieldName) => {
    setSelectedTableFieldNames((prev) => {
      // If selectedTableFieldNames is empty, the UI is showing fallback columns.
      // Seed from fallback so we don't wipe all other visible columns on first toggle.
      const base = prev.length > 0 ? prev : fallbackTableFieldNames;

      if (base.includes(fieldName)) {
        const next = base.filter((name) => name !== fieldName);
        return next.length ? next : [fieldName];
      }

      return [...base, fieldName];
    });
  };

  const resetColumns = () => {
    setSelectedTableFieldNames(fallbackTableFieldNames);
  };

  const isViewMode = modalMode === "view";
  const modalTitle =
    modalMode === "create"
      ? `Add ${title.replace(/s$/, "")}`
      : modalMode === "edit"
      ? `Edit ${title.replace(/s$/, "")}`
      : `${title.replace(/s$/, "")} Details`;

  const isAllRowsSelected = rows.length > 0 && selectedRows.length === rows.length;
  const canDeleteRecords = canManageRestrictedActions;
  const columnSpan = tableFields.length + 3;

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          success: { duration: 3000, style: { background: "#10B981", color: "#fff" } },
          error: { duration: 4000, style: { background: "#EF4444", color: "#fff" } },
        }}
      />

      <section className="py-1 bg-[#F8FAFC] min-h-screen">
        <div className="w-full xl:w-11/12 px-4 mx-auto mt-6">
          <div className="relative flex flex-col min-w-0 break-words w-full mb-6 shadow-lg rounded-lg bg-white border-0">
            <div className="rounded-t bg-white mb-0 px-6 py-6">
              <div className="text-center flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="text-left">
                  <p className="text-sm text-amber-500 font-semibold uppercase tracking-widest">CRM</p>
                  <h6 className="text-[#0F172A] text-2xl font-bold">{title}</h6>
                  <p className="text-sm text-[#64748B]">{description}</p>
                </div>

                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {pagination.total} Total
                  </span>
                  <button
                    onClick={() => fetchRows(pagination.limit, pagination.offset)}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                    disabled={loading}
                  >
                    <ArrowPathIcon className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                  <button
                    onClick={openCreateModal}
                    className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md flex items-center gap-2 transition"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 pb-4">
              {isUserPortal && bulkEditableFields.length > 0 && (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        {selectedRowIds.length ? `${selectedRowIds.length} selected` : "Select rows to update quickly"}
                      </p>
                      <p className="text-xs text-blue-700">
                        Users can update status, assignment, or active state from here.
                      </p>
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-3">
                      {bulkEditableFields.map((field) => {
                        const options = field.loadOptions ? fieldOptions[field.name] || [] : field.options || [];
                        const bulkLabel = field.bulkLabel || field.label;

                        if (field.type === "checkbox") {
                          return (
                            <select
                              key={`bulk-${field.name}`}
                              value={bulkUpdateValues[field.name] ?? ""}
                              onChange={(event) =>
                                setBulkUpdateValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                              }
                              className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                            >
                              <option value="">Keep {bulkLabel}</option>
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          );
                        }

                        return (
                          <select
                            key={`bulk-${field.name}`}
                            value={bulkUpdateValues[field.name] ?? ""}
                            onChange={(event) =>
                              setBulkUpdateValues((prev) => ({ ...prev, [field.name]: event.target.value }))
                            }
                            className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                          >
                            <option value="">{`Keep ${bulkLabel}`}</option>
                            {options.map((option) => (
                              <option key={`bulk-${field.name}-${option.value}`} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={clearSelectedRows}
                        type="button"
                        className="bg-white text-blueGray-600 font-semibold text-xs px-4 py-2 rounded shadow hover:bg-blueGray-50 transition"
                      >
                        Clear
                      </button>
                      <button
                        onClick={handleBulkUpdate}
                        type="button"
                        disabled={!selectedRowIds.length || actionLoadingKey === "bulk-update"}
                        className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md transition disabled:opacity-50"
                      >
                        {actionLoadingKey === "bulk-update" ? "Updating..." : "Update Selected"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-3 xl:grid-cols-6">
                {filters.map((filter) => {
                  const options = filter.loadOptions ? filterOptions[filter.name] || [] : filter.options || [];
                  return (
                    <select
                      key={filter.name}
                      value={filterState[filter.name] ?? ""}
                      onChange={(event) =>
                        setFilterState((prev) => ({
                          ...prev,
                          [filter.name]: event.target.value,
                        }))
                      }
                      className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                    >
                      <option value="">All {filter.label}</option>
                      {options.map((option) => (
                        <option key={`${filter.name}-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  );
                })}

                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  {sortableFields.map((field) => (
                    <option key={`sort-${field.name}`} value={field.name}>
                      Sort by {field.label}
                    </option>
                  ))}
                </select>

                <select
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                >
                  <option value="DESC">Descending</option>
                  <option value="ASC">Ascending</option>
                </select>

                <button
                  onClick={clearFilters}
                  className="bg-gray-100 text-blueGray-600 font-semibold text-xs px-4 py-2 rounded shadow hover:bg-gray-200 transition"
                >
                  Clear Filters
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="border-0 px-3 py-3 pl-10 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowColumnPicker((prev) => !prev)}
                    className="bg-white text-blueGray-600 font-semibold text-xs px-4 py-2 rounded shadow hover:bg-blueGray-50 transition"
                  >
                    Columns
                  </button>

                  {showColumnPicker && (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-lg border border-blueGray-100 bg-white p-4 shadow-xl">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-blueGray-700">Visible Columns</p>
                        <button
                          type="button"
                          onClick={resetColumns}
                          className="text-xs font-semibold text-blue-500 hover:text-blue-700"
                        >
                          Reset
                        </button>
                      </div>
                      <div className="space-y-2">
                        {selectableTableFields.map((field) => {
                          const isChecked = selectedTableFieldNames.length > 0
                            ? selectedTableFieldNames.includes(field.name)
                            : fallbackTableFieldNames.includes(field.name);
                          return (
                            <label
                              key={`column-${field.name}`}
                              className="flex items-center gap-2 text-sm text-blueGray-600 cursor-pointer select-none"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleColumnToggle(field.name)}
                              />
                              <span>{field.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4 md:hidden px-4 pb-4">
              {loading ? (
                <div className="rounded-2xl bg-blueGray-50 px-4 py-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500"></div>
                  <p className="mt-3 text-sm text-blueGray-500">Loading...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="rounded-2xl bg-blueGray-50 px-4 py-8 text-center">
                  <ExclamationTriangleIcon className="h-10 w-10 mx-auto mb-2 text-blueGray-300" />
                  <p className="text-base font-semibold text-blueGray-500">No records found</p>
                </div>
              ) : (
                rows.map((row) => {
                  const visibleRowActions = rowActions.filter(
                    (action) => typeof action.isVisible !== "function" || action.isVisible(row)
                  );

                  return (
                    <div
                      key={`mobile-${row.Id}`}
                      className="rounded-2xl border border-blueGray-100 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
                            {primaryFieldConfig?.label || primaryField}
                          </p>
                          <p className="mt-1 text-base font-bold text-blueGray-700">
                            {getDisplayValue(primaryFieldConfig, row[primaryField], row)}
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(row.Id)}
                          onChange={() => toggleRowSelection(row.Id)}
                          aria-label={`Select ${getDisplayValue(primaryFieldConfig, row[primaryField], row)}`}
                        />
                      </div>

                      <div className="mt-4 space-y-3">
                        {tableFields.map((field) => (
                          <div key={`mobile-${row.Id}-${field.name}`} className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wide text-blueGray-400">
                              {field.label}
                            </span>
                            <div className="text-right text-sm text-blueGray-600">
                              {renderTableValue(field, row)}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          onClick={() => openViewModal(row)}
                          className="text-blue-500 hover:text-blue-700"
                          title="View"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(row)}
                          className="text-green-500 hover:text-green-700"
                          title="Edit"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {canDeleteRecords && (
                          <button
                            onClick={() => {
                              setSelectedRow(row);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                        {visibleRowActions.map((action) => {
                          const key = `${row.Id}-${action.label}`;
                          return (
                            <button
                              key={`mobile-${key}`}
                              onClick={() => handleCustomRowAction(action, row)}
                              disabled={actionLoadingKey === key}
                              className={`text-xs font-semibold ${
                                actionToneClasses[action.tone] || "text-blueGray-500 hover:text-blueGray-700"
                              }`}
                            >
                              {actionLoadingKey === key ? "Working..." : action.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="hidden md:block w-full overflow-x-auto">
              <table className="items-center w-full bg-transparent border-collapse">
                <thead>
                  <tr>
                    <th className="px-4 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      <input
                        type="checkbox"
                        checked={isAllRowsSelected}
                        onChange={toggleSelectAllRows}
                        aria-label="Select all rows"
                      />
                    </th>
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      <div>{primaryFieldConfig?.label || primaryField}</div>
                      {primaryFieldConfig && renderColumnFilter(primaryFieldConfig)}
                    </th>
                    {tableFields.map((field) => (
                      <th
                        key={field.name}
                        className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left bg-blueGray-50 text-blueGray-500 border-blueGray-100"
                      >
                        <div>{field.label}</div>
                        {renderColumnFilter(field)}
                      </th>
                    ))}
                    <th className="px-6 align-middle border border-solid py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-center bg-blueGray-50 text-blueGray-500 border-blueGray-100">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columnSpan} className="text-center py-8">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-blueGray-500">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={columnSpan} className="text-center py-8">
                        <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-2 text-blueGray-300" />
                        <p className="text-lg font-semibold text-blueGray-500">No records found</p>
                        <p className="text-sm text-blueGray-400">Click "Add" to create your first record</p>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row) => {
                      const visibleRowActions = rowActions.filter(
                        (action) => typeof action.isVisible !== "function" || action.isVisible(row)
                      );

                      return (
                        <tr
                          key={row.Id}
                          className="hover:bg-blueGray-50 transition-colors cursor-pointer"
                          onClick={() => openViewModal(row)}
                        >
                          <td
                            className="border-t-0 px-4 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-center"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={selectedRowIds.includes(row.Id)}
                              onChange={() => toggleRowSelection(row.Id)}
                              aria-label={`Select ${getDisplayValue(primaryFieldConfig, row[primaryField])}`}
                            />
                          </td>
                          <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 font-semibold text-blueGray-700">
                            {getDisplayValue(primaryFieldConfig, row[primaryField])}
                          </td>
                          {tableFields.map((field) => (
                            <td
                              key={`${row.Id}-${field.name}`}
                              className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-blueGray-600"
                            >
                            {renderTableValue(field, row)}
                            </td>
                          ))}
                          <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                            <div
                              className="flex flex-nowrap items-center justify-center gap-2 whitespace-nowrap"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                onClick={() => openViewModal(row)}
                                className="text-blue-500 hover:text-blue-700"
                                title="View"
                              >
                                <EyeIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openEditModal(row)}
                                className="text-green-500 hover:text-green-700"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              {canDeleteRecords && (
                                <button
                                  onClick={() => {
                                    setSelectedRow(row);
                                    setShowDeleteModal(true);
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                  title="Delete"
                                >
                                  <TrashIcon className="h-5 w-5" />
                                </button>
                              )}

                              {visibleRowActions.map((action) => {
                                const key = `${row.Id}-${action.label}`;
                                return (
                                  <button
                                    key={key}
                                    onClick={() => handleCustomRowAction(action, row)}
                                    disabled={actionLoadingKey === key}
                                    className={`text-xs font-semibold ${
                                      actionToneClasses[action.tone] || "text-blueGray-500 hover:text-blueGray-700"
                                    }`}
                                  >
                                    {actionLoadingKey === key ? "Working..." : action.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {pagination.total > 0 && (
              <div className="px-6 py-4 border-t border-blueGray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-blueGray-600">Show</label>
                    <select
                      value={pagination.limit}
                      onChange={(event) => handleLimitChange(Number(event.target.value))}
                      className="border-0 px-3 py-2 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <span className="text-sm text-blueGray-600">
                      Showing {pagination.offset + 1} to {Math.min(pagination.offset + rows.length, pagination.total)} of {pagination.total}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.currentPage - 1)}
                      disabled={pagination.currentPage === 1}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.currentPage + 1)}
                      disabled={pagination.currentPage >= pagination.totalPages}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {showActionModal && activeAction && selectedRow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 flex flex-col">
              <TitleBar
                title={`${activeAction.label} ${title.replace(/s$/, "")}`}
                onClose={() => {
                  setShowActionModal(false);
                  setActiveAction(null);
                  setActionFormData({});
                  setActionFormErrors({});
                }}
              />

              <form onSubmit={handleActionSubmit}>
                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(activeAction.fields || []).map((field) => {
                      const options = field.loadOptions ? fieldOptions[field.name] || [] : field.options || [];
                      const inputClass = "border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full";
                      const value = actionFormData[field.name] ?? "";

                      return (
                        <div key={`action-${field.name}`} className={field.type === "textarea" ? "col-span-2" : ""}>
                          <label className="block text-blueGray-600 text-sm font-bold mb-2">
                            {getFieldLabel(field)} {field.required && <span className="text-red-500">*</span>}
                          </label>

                          {field.type === "textarea" ? (
                            <textarea
                              value={value}
                              onChange={(event) => handleActionFieldChange(field, event.target.value)}
                              rows="3"
                              className={inputClass}
                            />
                          ) : field.type === "checkbox" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(actionFormData[field.name])}
                              onChange={(event) => handleActionFieldChange(field, event.target.checked)}
                              className="h-4 w-4"
                            />
                          ) : field.type === "select" ? (
                            <select
                              value={value}
                              onChange={(event) => handleActionFieldChange(field, event.target.value)}
                              className={inputClass}
                            >
                              <option value="">Select {getFieldLabel(field)}</option>
                              {options.map((option) => (
                                <option key={`action-${field.name}-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type || "text"}
                              value={value}
                              onChange={(event) => handleActionFieldChange(field, event.target.value)}
                              placeholder={field.placeholder || ""}
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              className={inputClass}
                            />
                          )}

                          {actionFormErrors[field.name] ? (
                            <p className="mt-1 text-xs text-red-500">{actionFormErrors[field.name]}</p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-blueGray-200 px-6 py-4 bg-blueGray-50 rounded-b-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionModal(false);
                      setActiveAction(null);
                      setActionFormData({});
                      setActionFormErrors({});
                    }}
                    className="bg-white text-blueGray-600 font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoadingKey === `${selectedRow.Id}-${activeAction.label}`}
                    className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md disabled:opacity-50"
                  >
                    {actionLoadingKey === `${selectedRow.Id}-${activeAction.label}` ? "Working..." : activeAction.label}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="flex items-start justify-center min-h-full p-4 sm:p-8">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8 flex flex-col">
              <TitleBar title={modalTitle} onClose={() => { setShowModal(false); resetForm(); }} />

              <form onSubmit={handleSubmit}>
                <div className="p-6 max-h-[calc(100vh-250px)] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleFields.map((field) => {
                      if (field.viewOnly && !isViewMode) {
                        return null;
                      }

                      if (field.createOnly && modalMode !== "create") {
                        return null;
                      }

                      if (field.name === "UpdatedBy" && modalMode === "create") {
                        return null;
                      }

                      if ((field.name === "CreatedAt" || field.name === "UpdatedAt") && modalMode === "create") {
                        return null;
                      }

                      const options = field.loadOptions ? fieldOptions[field.name] || [] : field.options || [];
                      const isFieldReadOnly = isViewMode || field.readOnly || field.submit === false;
                      const inputClass = `border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full ${
                        formErrors[field.name] ? "ring-2 ring-red-500" : ""
                      } ${isFieldReadOnly ? "bg-gray-100" : ""}`;

                      return (
                        <div key={field.name} className={field.type === "textarea" ? "col-span-2" : ""}>
                          <label className="block text-blueGray-600 text-sm font-bold mb-2">
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </label>

                          {field.type === "textarea" ? (
                            <textarea
                              value={formData[field.name] ?? ""}
                              onChange={(event) => handleFormChange(field, event.target.value)}
                              disabled={isFieldReadOnly}
                              rows="3"
                              className={inputClass}
                            />
                          ) : field.type === "checkbox" ? (
                            <input
                              type="checkbox"
                              checked={Boolean(formData[field.name])}
                              onChange={(event) => handleFormChange(field, event.target.checked)}
                              disabled={isFieldReadOnly}
                              className="h-4 w-4"
                            />
                          ) : field.type === "select" ? (
                            <select
                              value={formData[field.name] ?? ""}
                              onChange={(event) => handleFormChange(field, event.target.value)}
                              disabled={isFieldReadOnly}
                              className={inputClass}
                            >
                              <option value="">{field.placeholder || `Select ${field.label}`}</option>
                              {options.map((option) => (
                                <option key={`${field.name}-${option.value}`} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type || "text"}
                              value={formData[field.name] ?? ""}
                              onChange={(event) => handleFormChange(field, event.target.value)}
                              disabled={isFieldReadOnly}
                              className={inputClass}
                              placeholder={field.placeholder || ""}
                              min={field.min}
                              max={field.max}
                              step={field.step}
                            />
                          )}

                          {formErrors[field.name] && <p className="text-red-500 text-xs mt-1">{formErrors[field.name]}</p>}
                        </div>
                      );
                    })}
                  </div>

                  {selectedRow?.Id && (
                    <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
                      <div className="rounded-xl border border-blueGray-100 bg-blueGray-50/40 p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-bold uppercase tracking-wide text-blueGray-700">Comments</h4>
                            <p className="text-xs text-blueGray-500">Discussion with username and time.</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <textarea
                            value={newComment}
                            onChange={(event) => setNewComment(event.target.value)}
                            rows="3"
                            className="border-0 px-3 py-3 placeholder-blueGray-300 text-blueGray-600 bg-white rounded text-sm shadow focus:outline-none focus:ring w-full"
                            placeholder={`Add a ${title.replace(/s$/, "").toLowerCase()} comment`}
                          />
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={handleAddComment}
                              disabled={commentSubmitting}
                              className="bg-blue-500 text-white font-bold uppercase text-xs px-4 py-2 rounded shadow hover:shadow-md transition disabled:opacity-50"
                            >
                              {commentSubmitting ? "Posting..." : "Add Comment"}
                            </button>
                          </div>
                        </div>

                        {commentsLoading ? (
                          <p className="text-sm text-blueGray-500">Loading comments...</p>
                        ) : comments.length ? (
                          <div className="space-y-3">
                            {comments.map((comment) => (
                              <div key={comment.Id} className="rounded-lg bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold text-blueGray-700">
                                    {comment.CommentedByName || comment.CommentedByEmail || "Unknown user"}
                                  </p>
                                  <span className="text-xs text-blueGray-400">
                                    {formatDateTime(comment.CreatedAt)}
                                  </span>
                                </div>
                                <p className="mt-2 whitespace-pre-wrap text-sm text-blueGray-600">
                                  {comment.CommentText}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-blueGray-500">No comments yet.</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-blueGray-100 bg-blueGray-50/40 p-4">
                        <div className="mb-4">
                          <h4 className="text-sm font-bold uppercase tracking-wide text-blueGray-700">History</h4>
                          <p className="text-xs text-blueGray-500">Change timeline across this CRM record.</p>
                        </div>

                        {historyLoading ? (
                          <p className="text-sm text-blueGray-500">Loading history...</p>
                        ) : historyItems.length ? (
                          <div className="space-y-3">
                            {historyItems.map((entry) => (
                              <div key={entry.Id} className="rounded-lg bg-white p-3 shadow-sm">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm font-semibold capitalize text-blueGray-700">
                                    {formatHistoryLabel(entry)}
                                  </p>
                                  <span className="text-xs text-blueGray-400">
                                    {formatDateTime(entry.CreatedAt)}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm text-blueGray-600">
                                  {entry.UserName || entry.UserEmail || "System"}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-blueGray-500">No history yet.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 p-6 border-t sticky bottom-0 bg-white rounded-b-xl">
                  {isViewMode && selectedRow && (
                    <button
                      type="button"
                      onClick={() => openEditModal(selectedRow)}
                      className="bg-emerald-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
                  >
                    {isViewMode ? "Close" : "Cancel"}
                  </button>
                  {!isViewMode && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="bg-blue-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md disabled:opacity-50 flex items-center gap-2 transition"
                    >
                      {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                      {submitting ? "Saving..." : modalMode === "create" ? "Create" : "Update"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && canDeleteRecords && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <div className="flex items-center gap-2">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                <h3 className="text-xl font-bold text-blueGray-700">Delete Record</h3>
              </div>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRow(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-blueGray-600">Are you sure you want to delete this record?</p>
              {selectedRow && (
                <div className="mt-4 bg-blueGray-50 p-3 rounded">
                  <p className="text-sm">
                    <strong>{primaryFieldConfig?.label || primaryField}:</strong> {getDisplayValue(primaryFieldConfig, selectedRow[primaryField])}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRow(null);
                }}
                className="bg-gray-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-500 text-white font-bold uppercase text-xs px-6 py-3 rounded shadow hover:shadow-md transition disabled:opacity-50 flex items-center gap-2"
              >
                {deleting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CrmWorkspace;
