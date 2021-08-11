import React, { useState, useEffect, ReactElement } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  Handle,
} from 'react-flow-renderer';

// import { useSubscription } from '@effection/react';

let initialElements = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Node 1' },
    position: { x: 250, y: 5 },
  },
  {
    id: '2',
    data: { label: <div>Node 2</div> },
    position: { x: 100, y: 100 },
  },
  { id: 'e1-2', source: '1', target: '2', animated: true },
  {
    id: '3',
    type: 'special',
    data: { label: <div>Node 2</div> },
    position: { x: 100, y: 100 },
  },
  { id: 'e1-3', source: '2', target: '3', animated: true },
];

const onLoad = (reactFlowInstance) => {
  console.log('flow loaded:', reactFlowInstance);
  reactFlowInstance.fitView();
};

export function GraphPage(): ReactElement {
  let [elements, setElements] = useState(initialElements);
  let store = useSubscription();

  useEffect(
    () => {
      console.log(store);
    },
    //   setElements({ dataProvider })
    []
  );

  return <Graph elements={elements} />;
}

export function Graph({ elements }): ReactElement {
  return (
    <ReactFlow
      onLoad={onLoad}
      elements={elements}
      nodeTypes={{ special: CustomNode }}
    >
      <MiniMap
        nodeStrokeColor={(n) => {
          if (n.style?.background) return n.style.background;
          if (n.type === 'input') return '#0041d0';
          if (n.type === 'output') return '#ff0072';
          if (n.type === 'default') return '#1a192b';

          return '#eee';
        }}
        nodeColor={(n) => {
          if (n.style?.background) return n.style.background;

          return '#fff';
        }}
        nodeBorderRadius={2}
      />
      <Controls />
      <Background color="#aaa" gap={16} />
    </ReactFlow>
  );
}

const CustomNode = ({ data, isConnectable }) => {
  return (
    <>
      <Handle
        type="target"
        position="left"
        style={{ background: '#555' }}
        onConnect={(params) => console.log('handle onConnect', params)}
        isConnectable={isConnectable}
      />
      <div>
        Custom Color Picker Node: <strong>{data.color}</strong>
      </div>
      <input
        className="nodrag"
        type="color"
        onChange={data.onChange}
        defaultValue={data.color}
      />
      <Handle
        type="source"
        position="right"
        id="a"
        style={{ top: 10, background: '#555' }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position="right"
        id="b"
        style={{ bottom: 10, top: 'auto', background: '#555' }}
        isConnectable={isConnectable}
      />
    </>
  );
};

import { useContext } from 'react';
import { EffectionContext } from '@effection/react';

export function useSubscription<T>(): T | undefined {
  let scope = useContext(EffectionContext);
  let [state, setState] = useState<T>();

  useEffect(() => {
    let task = scope.run();
    // .forEach((value) => {
    //   setState(value);
    // });
    console.log(task.toJSON());
    return () => {
      task.halt();
    };
  }, [scope]);

  return state;
}
