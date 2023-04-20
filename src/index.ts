// Entry point for the package

export function test(): string {
  return "Hello from the package!"
}

export * from "./clients/index"
export * from "./prompters/index"
