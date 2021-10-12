import { Operation } from '@effection/core';
import type { Request, Response } from 'express';

export interface Template {
  (req: Request, res: Response): string;
}

export interface Logger {
  (req: Request, res: Response): Operation<void>;
}
