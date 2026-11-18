import { Body, Button, Screen, Title } from "../components/ui";

export function WelcomeScreen({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted: () => void;
  onSignIn: () => void;
}) {
  return (
    <Screen>
      <Title>Eat smarter with your Dining Dollars.</Title>
      <Body>Find campus meals that fit your budget and nutrition goals.</Body>
      <Button label="Get started" onPress={onGetStarted} />
      <Button label="Sign in" variant="link" onPress={onSignIn} />
    </Screen>
  );
}
