import React, { useEffect, useMemo, useRef, useState } from "react";
import { resolveAssetUrl } from "../../../utils/assetUrl";
import "./ClassicCorporateOrgChart.css";

const readNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeText = (value, fallback = "") => String(value ?? fallback).trim();

const getInitials = (value) => {
  const clean = normalizeText(value);
  if (!clean) return "NA";
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};

const sortByName = (items) =>
  [...(items || [])].sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

const normalizeRows = (rows = [], getRoleName) =>
  (rows || [])
    .map((row) => {
      const id = readNumber(row.UserId ?? row.userId ?? row.id);
      if (!id) return null;

      const managerId = readNumber(row.ReportingManagerId ?? row.reportingManagerId);
      const roleId = readNumber(row.RoleId ?? row.roleId);
      const roleNameFromFn = typeof getRoleName === "function" ? getRoleName(roleId) : "";
      const roleName =
        normalizeText(roleNameFromFn) ||
        normalizeText(row.RoleName ?? row.roleName) ||
        "Team Member";

      const department =
        normalizeText(row.Department ?? row.department) ||
        normalizeText(row.CompanyName ?? row.companyName) ||
        "Unassigned";

      return {
        id,
        managerId: managerId && managerId !== id ? managerId : null,
        name: normalizeText(row.Name ?? row.name, `User ${id}`),
        email: normalizeText(row.Email ?? row.email),
        role: roleName,
        department,
        image: row.userImage ?? row.image ?? row.ProfilePicture ?? row.profilePicture ?? "",
        raw: row,
        children: [],
      };
    })
    .filter(Boolean);

const buildTree = (flatRows = []) => {
  const map = new Map();
  flatRows.forEach((node) => {
    map.set(node.id, { ...node, children: [] });
  });

  const parentById = new Map();
  const roots = [];

  flatRows.forEach((node) => {
    const current = map.get(node.id);
    if (node.managerId && map.has(node.managerId)) {
      map.get(node.managerId).children.push(current);
      parentById.set(node.id, node.managerId);
    } else {
      roots.push(current);
      parentById.set(node.id, null);
    }
  });

  const sortDeep = (nodes) => {
    const sorted = sortByName(nodes);
    sorted.forEach((node) => {
      node.children = sortDeep(node.children);
    });
    return sorted;
  };

  return {
    roots: sortDeep(roots),
    nodeMap: map,
    parentById,
  };
};

const computeDescendantCounts = (roots = []) => {
  const counts = new Map();

  const dfs = (node) => {
    let total = 0;
    (node.children || []).forEach((child) => {
      total += 1 + dfs(child);
    });
    counts.set(node.id, total);
    return total;
  };

  roots.forEach((root) => dfs(root));
  return counts;
};

const buildCollapsedBeyondLevel = (roots = [], maxVisibleLevel = 2) => {
  const collapsed = new Set();

  const dfs = (node, level) => {
    if (node.children?.length && level > maxVisibleLevel) {
      collapsed.add(node.id);
    }

    (node.children || []).forEach((child) => dfs(child, level + 1));
  };

  roots.forEach((root) => dfs(root, 1));
  return collapsed;
};

const toSet = (value) => new Set(Array.from(value || []));

const collectSubtreeNodes = (root) => {
  if (!root) return [];
  const out = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    out.push(current);
    for (let index = current.children.length - 1; index >= 0; index -= 1) {
      stack.push(current.children[index]);
    }
  }
  return out;
};

const ClassicCorporateOrgChart = ({
  rows = [],
  getRoleName,
  selectedUserId = null,
  onNodeClick,
}) => {
  const normalizedRows = useMemo(() => normalizeRows(rows, getRoleName), [rows, getRoleName]);

  const { roots, nodeMap, parentById } = useMemo(
    () => buildTree(normalizedRows),
    [normalizedRows],
  );

  const descendantCounts = useMemo(() => computeDescendantCounts(roots), [roots]);
  const mainRoot = useMemo(() => {
    if (!roots.length) return null;

    const scoredRoots = roots.map((root) => {
      const baseScore = descendantCounts.get(root.id) || 0;
      const priorityBoost =
        /super admin|chief executive officer|ceo/i.test(`${root.role} ${root.name}`) ? 1_000_000 : 0;
      return {
        root,
        score: baseScore + priorityBoost,
      };
    });

    scoredRoots.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.root.id - b.root.id;
    });

    return scoredRoots[0].root;
  }, [roots, descendantCounts]);

  const chartRoots = useMemo(() => (mainRoot ? [mainRoot] : []), [mainRoot]);
  const chartNodes = useMemo(() => collectSubtreeNodes(mainRoot), [mainRoot]);
  const chartNodeIds = useMemo(() => new Set(chartNodes.map((node) => node.id)), [chartNodes]);
  const defaultCollapsedIds = useMemo(() => buildCollapsedBeyondLevel(chartRoots, 2), [chartRoots]);

  const departmentCount = useMemo(
    () =>
      new Set(
        chartNodes
          .map((node) => normalizeText(node.department))
          .filter(Boolean),
      ).size,
    [chartNodes],
  );

  const managerCount = useMemo(
    () => chartNodes.filter((node) => (node.children || []).length > 0).length,
    [chartNodes],
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIds, setHighlightedIds] = useState(new Set());
  const [collapsedIds, setCollapsedIds] = useState(new Set());
  const [activeNodeId, setActiveNodeId] = useState(null);

  const nodeRefs = useRef(new Map());

  useEffect(() => {
    nodeRefs.current.clear();
    setCollapsedIds(toSet(defaultCollapsedIds));
    setHighlightedIds(new Set());

    const selectedId = readNumber(selectedUserId);
    if (selectedId && chartNodeIds.has(selectedId)) {
      setActiveNodeId(selectedId);
    } else {
      setActiveNodeId(mainRoot?.id || null);
    }
  }, [defaultCollapsedIds, chartNodeIds, mainRoot, selectedUserId]);

  useEffect(() => {
    const selectedId = readNumber(selectedUserId);
    if (selectedId && chartNodeIds.has(selectedId)) {
      setActiveNodeId(selectedId);
    }
  }, [selectedUserId, chartNodeIds]);

  const expandAncestors = (ids) => {
    if (!ids.length) return;

    setCollapsedIds((previous) => {
      const next = new Set(previous);

      ids.forEach((id) => {
        next.delete(id);
        let cursor = parentById.get(id);
        while (cursor) {
          next.delete(cursor);
          cursor = parentById.get(cursor);
        }
      });

      return next;
    });
  };

  const handleSearch = () => {
    const query = normalizeText(searchQuery).toLowerCase();
    if (!query) {
      setHighlightedIds(new Set());
      return;
    }

    const matches = chartNodes
      .filter((node) => {
        return (
          node.name.toLowerCase().includes(query) ||
          node.role.toLowerCase().includes(query) ||
          node.department.toLowerCase().includes(query)
        );
      })
      .map((node) => node.id);

    setHighlightedIds(new Set(matches));

    if (!matches.length) return;

    expandAncestors(matches);
    setActiveNodeId(matches[0]);

    window.requestAnimationFrame(() => {
      const target = nodeRefs.current.get(matches[0]);
      target?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    });
  };

  const resetView = () => {
    setSearchQuery("");
    setHighlightedIds(new Set());
    setCollapsedIds(toSet(defaultCollapsedIds));

    if (mainRoot?.id) {
      setActiveNodeId(mainRoot.id);
    }
  };

  const expandAll = () => {
    setCollapsedIds(new Set());
  };

  const collapseToLevelTwo = () => {
    setCollapsedIds(toSet(defaultCollapsedIds));
  };

  const toggleNode = (nodeId) => {
    setCollapsedIds((previous) => {
      const next = new Set(previous);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleNodeSelect = (node) => {
    setActiveNodeId(node.id);
    if (typeof onNodeClick === "function") {
      onNodeClick(node.raw || node);
    }
  };

  const renderNode = (node, level = 1) => {
    const hasChildren = node.children?.length > 0;
    const isCollapsed = collapsedIds.has(node.id);
    const isHighlighted = highlightedIds.has(node.id);
    const isSelected = Number(activeNodeId) === Number(node.id);
    const directReports = node.children.length;
    const totalReports = descendantCounts.get(node.id) || 0;

    const imageSrc = node.image ? resolveAssetUrl(node.image) : "";
    const fallbackInitials = getInitials(node.name);

    const classNames = ["ccoc-node-item"];
    if (isCollapsed) classNames.push("ccoc-collapsed");
    if (isHighlighted) classNames.push("ccoc-highlight");

    const nodeClassNames = ["ccoc-node"];
    if (isSelected) nodeClassNames.push("ccoc-selected");

    return (
      <li
        key={node.id}
        className={classNames.join(" ")}
        data-id={node.id}
        ref={(element) => {
          if (element) {
            nodeRefs.current.set(node.id, element);
          } else {
            nodeRefs.current.delete(node.id);
          }
        }}
      >
        <div className="ccoc-card-wrap">
          <div
            className={nodeClassNames.join(" ")}
            role="button"
            tabIndex={0}
            onClick={() => handleNodeSelect(node)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleNodeSelect(node);
              }
            }}
          >
            <div className="ccoc-node-header">
              <div className="ccoc-node-name">{node.name}</div>
              <div className="ccoc-node-role">{node.role}</div>
            </div>

            <div className="ccoc-node-body">
              <div className="ccoc-meta">
                <span>{node.department}</span>
                <span>ID: EMP-{String(node.id).padStart(3, "0")}</span>
              </div>

              <div className="ccoc-profile-row">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={node.name}
                    className="ccoc-avatar"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="ccoc-avatar ccoc-avatar-fallback">{fallbackInitials}</div>
                )}

                <div className="ccoc-profile-text">
                  <div className="ccoc-email">{node.email || "No email"}</div>
                  <div className="ccoc-level">Level {level}</div>
                </div>
              </div>

              <div className="ccoc-badge-row">
                <span className="ccoc-badge">
                  {directReports} direct / {totalReports} total
                </span>

                <button
                  type="button"
                  className={`ccoc-toggle ${hasChildren ? "" : "ccoc-toggle-hidden"}`.trim()}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (hasChildren) toggleNode(node.id);
                  }}
                  aria-label={isCollapsed ? "Expand branch" : "Collapse branch"}
                >
                  {isCollapsed ? "+" : "-"}
                </button>
              </div>
            </div>
          </div>

          {hasChildren ? <div className="ccoc-downline" /> : null}
        </div>

        {hasChildren ? <ul>{node.children.map((child) => renderNode(child, level + 1))}</ul> : null}
      </li>
    );
  };

  // Let parent component handle empty state display
  return chartNodes.length === 0 ? null : (
    <div className="ccoc-wrapper">
      <div className="ccoc-toolbar">
        <div className="ccoc-title-wrap">
          <h3>Organization Chart</h3>
          <p>Live hierarchy view with collapsible branches and search.</p>
        </div>

        <div className="ccoc-actions">
          <input
            type="text"
            placeholder="Search by employee name or role"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSearch();
            }}
          />
          <button type="button" onClick={handleSearch}>
            Search
          </button>
          <button type="button" className="ccoc-secondary" onClick={resetView}>
            Reset
          </button>
          <button type="button" className="ccoc-secondary" onClick={expandAll}>
            Expand All
          </button>
          <button type="button" className="ccoc-secondary" onClick={collapseToLevelTwo}>
            Collapse to Level 2
          </button>
        </div>
      </div>

      <div className="ccoc-stats">
        <div className="ccoc-stat">
          <div className="ccoc-stat-label">Total Employees</div>
          <div className="ccoc-stat-value">{chartNodes.length}</div>
        </div>
        <div className="ccoc-stat">
          <div className="ccoc-stat-label">Departments</div>
          <div className="ccoc-stat-value">{departmentCount}</div>
        </div>
        <div className="ccoc-stat">
          <div className="ccoc-stat-label">Managers</div>
          <div className="ccoc-stat-value">{managerCount}</div>
        </div>
      </div>

      <div className="ccoc-chart-shell">
        <div className="ccoc-org-chart">
          <ul className="ccoc-tree">{chartRoots.map((rootNode) => renderNode(rootNode, 1))}</ul>
        </div>
      </div>
    </div>
  );
};

export default ClassicCorporateOrgChart;
