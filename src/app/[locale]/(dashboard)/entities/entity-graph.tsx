'use client';

import React, { useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { formatCurrency, cn } from '@/lib/utils';
import { Building2, User } from 'lucide-react';

// ─── Types (duplicated here to avoid cross-file imports in dynamic context) ──

type EntityType = 'corporation' | 'individual';
type CorporationType = 'ccpc' | 'general' | 'professional' | 'holding' | 'operating' | 'other';

interface Entity {
  id: string;
  name: string;
  entity_type: EntityType;
  corporation_type: CorporationType | null;
  is_current_org: boolean;
}

interface EntityRelation {
  id: string;
  parent_entity_id: string;
  child_entity_id: string;
  ownership_percentage: number;
  share_class: string | null;
}

interface FinancialFlow {
  id: string;
  from_entity_id: string;
  to_entity_id: string;
  amount: number;
  date: string;
}

export interface EntityGraphProps {
  entities: Entity[];
  relations: EntityRelation[];
  flows: FinancialFlow[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
}

// ─── Custom Node ──────────────────────────────────────────────────────────────

interface EntityNodeData {
  label: string;
  entityType: EntityType;
  corpType: CorporationType | null;
  isCurrentOrg: boolean;
}

function EntityNode({ data, selected }: NodeProps) {
  const d = data as EntityNodeData;
  const isIndividual = d.entityType === 'individual';
  const isCurrent = d.isCurrentOrg;

  const bg = isCurrent
    ? 'bg-indigo-600 border-indigo-500'
    : isIndividual
    ? 'bg-sky-500 border-sky-400'
    : 'bg-slate-700 border-slate-600';

  const ringClass = selected ? 'ring-2 ring-amber-400 ring-offset-1' : '';

  return (
    <>
      <Handle type="target" position={Position.Top} className="!bg-indigo-400 !w-2 !h-2" />
      <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border shadow-sm min-w-[130px] max-w-[160px] cursor-pointer', bg, ringClass)}>
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0">
          {isIndividual
            ? <User size={14} className="text-white" />
            : <Building2 size={14} className={isCurrent ? 'text-white' : 'text-white opacity-80'} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate leading-tight">
            {d.label.length > 16 ? d.label.slice(0, 15) + '…' : d.label}
          </p>
          <p className="text-[10px] text-white/60 truncate leading-tight mt-0.5">
            {isCurrent ? 'Entité courante' : isIndividual ? 'Particulier' : d.corpType ?? 'Société'}
          </p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-indigo-400 !w-2 !h-2" />
    </>
  );
}

const nodeTypes = { entityNode: EntityNode };

// ─── Graph Canvas ─────────────────────────────────────────────────────────────

export default function EntityGraph({ entities, relations, flows, selectedEntityId, onSelectEntity }: EntityGraphProps) {
  const centerX = 250;
  const centerY = 200;
  const levelGap = 160;

  const currentOrg = entities.find((e) => e.is_current_org);
  const others = entities.filter((e) => !e.is_current_org);

  const parentIds = new Set(
    relations.filter((r) => r.child_entity_id === currentOrg?.id).map((r) => r.parent_entity_id)
  );
  const childIds = new Set(
    relations.filter((r) => r.parent_entity_id === currentOrg?.id).map((r) => r.child_entity_id)
  );

  const parents = others.filter((e) => parentIds.has(e.id));
  const children = others.filter((e) => childIds.has(e.id));
  const unconnected = others.filter((e) => !parentIds.has(e.id) && !childIds.has(e.id));

  const buildNodes = useCallback((): Node[] => {
    const result: Node[] = [];
    const parentGap = 200;
    const parentStartX = centerX - ((parents.length - 1) * parentGap) / 2;
    parents.forEach((e, i) => {
      result.push({
        id: e.id, type: 'entityNode',
        position: { x: parentStartX + i * parentGap, y: centerY - levelGap },
        data: { label: e.name, entityType: e.entity_type, corpType: e.corporation_type, isCurrentOrg: false },
        selected: selectedEntityId === e.id,
      });
    });
    if (currentOrg) {
      result.push({
        id: currentOrg.id, type: 'entityNode',
        position: { x: centerX, y: centerY },
        data: { label: currentOrg.name, entityType: currentOrg.entity_type, corpType: currentOrg.corporation_type, isCurrentOrg: true },
        selected: selectedEntityId === currentOrg.id,
      });
    }
    const childGap = 180;
    const childStartX = centerX - ((children.length - 1) * childGap) / 2;
    children.forEach((e, i) => {
      result.push({
        id: e.id, type: 'entityNode',
        position: { x: childStartX + i * childGap, y: centerY + levelGap },
        data: { label: e.name, entityType: e.entity_type, corpType: e.corporation_type, isCurrentOrg: false },
        selected: selectedEntityId === e.id,
      });
    });
    unconnected.forEach((e, i) => {
      result.push({
        id: e.id, type: 'entityNode',
        position: { x: centerX + 350, y: 80 + i * 130 },
        data: { label: e.name, entityType: e.entity_type, corpType: e.corporation_type, isCurrentOrg: false },
        selected: selectedEntityId === e.id,
      });
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entities, selectedEntityId]);

  const buildEdges = useCallback((): Edge[] => {
    const result: Edge[] = [];
    relations.forEach((r) => {
      result.push({
        id: `rel-${r.id}`, source: r.parent_entity_id, target: r.child_entity_id,
        label: `${r.ownership_percentage}%${r.share_class ? ` Cat. ${r.share_class}` : ''}`,
        labelStyle: { fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#eef2ff', stroke: '#c7d2fe' },
        labelBgPadding: [4, 3] as [number, number],
        style: { stroke: '#6366f1', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1', width: 16, height: 16 },
        type: 'smoothstep',
      });
    });
    const flowMap = new Map<string, FinancialFlow>();
    flows.forEach((f) => {
      const key = `${f.from_entity_id}-${f.to_entity_id}`;
      const existing = flowMap.get(key);
      if (!existing || new Date(f.date) > new Date(existing.date)) flowMap.set(key, f);
    });
    flowMap.forEach((flow) => {
      result.push({
        id: `flow-${flow.id}`, source: flow.from_entity_id, target: flow.to_entity_id,
        label: formatCurrency(flow.amount),
        labelStyle: { fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#ecfdf5', stroke: '#a7f3d0' },
        labelBgPadding: [4, 3] as [number, number],
        style: { stroke: '#10b981', strokeWidth: 1.5, strokeDasharray: '6 3' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981', width: 14, height: 14 },
        type: 'smoothstep',
      });
    });
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relations, flows]);

  const [nodes, setNodes, onNodesChange] = useNodesState(buildNodes());
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges());

  useEffect(() => { setNodes(buildNodes()); }, [buildNodes, setNodes]);
  useEffect(() => { setEdges(buildEdges()); }, [buildEdges, setEdges]);

  return (
    <div style={{ height: 420 }} className="rounded-xl overflow-hidden border border-gray-100">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => {
          onSelectEntity(selectedEntityId === node.id ? null : node.id);
        }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#e2e8f0" gap={24} size={1} />
        <Controls showInteractive={false} className="!shadow-sm !border !border-gray-200 !rounded-xl" />
        <MiniMap
          nodeColor={(node) => {
            const d = node.data as EntityNodeData;
            return d.isCurrentOrg ? '#4f46e5' : d.entityType === 'individual' ? '#0ea5e9' : '#1e293b';
          }}
          className="!rounded-xl !border !border-gray-200 !shadow-sm"
          maskColor="rgba(241,245,249,0.6)"
        />
      </ReactFlow>
    </div>
  );
}
