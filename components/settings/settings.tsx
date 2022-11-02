import { AppContext } from "../../lib/AppContext";
import { Button, Modal, ToggleSwitch } from "flowbite-react";
import React, { useContext } from "react";
import { DiAptana } from "react-icons/di";


/* eslint-disable-next-line */
export interface SettingsProps { }

export function Settings(props: SettingsProps) {
  const {config,setConfig} = useContext(AppContext)
  const [isDialogOpen, setDialogOpen] = React.useState(false);


  function onClick() {
    setDialogOpen(true)
  }
  function onClose() {
    setDialogOpen(false)
  }

  function handleLiveMarketChange(value){
    setConfig({
      ...config,
      liveMarket:value
    });
  }

  return (
    <>
      <Button onClick={onClick}>
        <DiAptana/>
      </Button>
      {isDialogOpen && (
      <Modal
        show={true}
        onClose={onClose}
      >
        <Modal.Header>
          Settings
        </Modal.Header>
        <Modal.Body>
          <ToggleSwitch
            checked={config.liveMarket}
            label="Live market"
            onChange={handleLiveMarketChange}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
      )}
    </>
  );
}

export default Settings;
