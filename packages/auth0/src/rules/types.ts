import { Person } from '@simulacrum/server';

export type RuleUser = Person;

export interface RuleContext<A, I> {
   clientID: string
   accessToken: {
       scope: string | string[]
   } & A

   idToken: I
}
