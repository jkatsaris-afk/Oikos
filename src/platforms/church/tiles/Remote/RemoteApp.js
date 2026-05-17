import { useParams } from "react-router-dom";

import RemotePage from "./RemotePage";

export default function RemoteApp({ showHeader = true, standalone = false }) {
  const { controller } = useParams();

  return (
    <RemotePage
      initialController={controller}
      showHeader={showHeader}
      standalone={standalone}
    />
  );
}
