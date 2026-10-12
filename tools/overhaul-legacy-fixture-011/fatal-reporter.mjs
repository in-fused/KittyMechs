import {writeFileSync} from 'node:fs';
export default class FatalReporter {
  onTestRunEnd(modules,unhandledErrors,reason){
    const tasks=[];
    function visit(task){tasks.push({name:task.name,type:task.type,state:task.result?.state,errors:task.result?.errors??[]});for(const child of task.tasks??[])visit(child);}
    for(const module of modules)visit(module.task);
    writeFileSync('runtime-errors.json',JSON.stringify({reason,unhandledErrors,tasks},null,2));
  }
}
