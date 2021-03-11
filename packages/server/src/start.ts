import { spawnServer } from './server';
import { run } from '@effection/core';

// dev only
(async () => {  
  await spawnServer(run());

  // do I need to 
})();