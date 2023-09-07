/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/no-shadow */
export interface PageArgs {
  first?: number;
  before?: string;
  last?: number;
  after?: string;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface Page<T> {
  totalCount: number;
  edges: {
    node: T;
    cursor: string;
  }[];
  nodes: T[];
  pageInfo: PageInfo;
}

export interface RelayPagingOptions {
  first?: number;
  after?: string;
  last?: number;
  before?: string;
}

const identity = <A>(a: A): A => a;

export function applyRelayPagination<T, R>(
  nodes: T[],
  args: PageArgs,
  mapper: (a: T) => R = identity as (a: T) => R,
): Page<R> {
  let range = applyCursorsToEdges(nodes, args.before, args.after);

  let edges = edgesToReturn(range, args.first, args.last).map(edge => ({
    ...edge,
    node: mapper(edge.node),
  }));

  let [first] = edges;
  let last = edges.slice().pop();

  return {
    totalCount: nodes.length,
    edges,
    nodes: edges.map(e => e.node),
    pageInfo: {
      get hasNextPage() {
        let { first, before } = args;
        if (first != null) {
          return range.length > first;
        } else if (before != null) {
          return Number(before) < range.length - 1;
        }
        return false;
      },
      get hasPreviousPage() {
        let { last, after } = args;
        if (last != null) {
          return range.length > last;
        } else if (after != null) {
          return Number(after) > 0;
        }
        return false;
      },
      startCursor: first?.cursor,
      endCursor: last?.cursor,
    } as PageInfo,
  };
}

function applyCursorsToEdges<T>(nodes: T[], before?: string, after?: string) {
  let afterIdx = !!after ? Number(after) : -1;
  let beforeIdx = !!before ? Number(before) : nodes.length;

  let edges = nodes.slice(afterIdx + 1, beforeIdx).map((node, i) => ({
    node,
    cursor: (afterIdx + 1 + i).toString(),
  }));

  return edges;
}

function edgesToReturn<T>(edges: T[], first?: number, last?: number) {
  let newEdges: T[] = [];
  if (first == null && last == null) {
    first = 100;
  }
  if (first != null) {
    if (first < 0) {
      throw new Error(`value of first must be greater than 0, was ${first}`);
    }
    newEdges = edges.slice(0, first);
  }
  if (last != null) {
    if (last < 0) {
      throw new Error(`value of 'after' must be greater than 0, was ${last}`);
    }
    newEdges = edges.slice(-last);
  }

  return newEdges;
}
