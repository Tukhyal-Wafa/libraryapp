import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders library login", () => {
  render(<App />);
  const loginElement = screen.getByText(/Library Login/i);
  expect(loginElement).toBeInTheDocument();
});
