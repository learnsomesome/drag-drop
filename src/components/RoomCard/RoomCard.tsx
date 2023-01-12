import { UniqueIdentifier } from "@dnd-kit/core";
import { Dropdown, Form, Input, Modal, Select } from "antd";
import classNames from "classnames";
import { useEffect, useMemo, useState } from "react";
import { Room } from "../../App";
import edit from "../../assets/edit.svg";
import { COMPONENTS_TITLES, ROOM_DICT } from "../../constant";

import styles from "./RoomCard.module.less";

interface Props {
  isComponent?: boolean;
  onHandle?: (handle: boolean) => void;
  onDelete?: (id: UniqueIdentifier) => void;
  onSave?: (id: UniqueIdentifier, vs: any) => void;
}

export const RoomCard = ({
  isComponent,
  onHandle = () => {},
  onDelete = () => {},
  onSave = () => {},
  id,
  title,
  roomTypeCode,
  beds,
  noBeds,
}: Props & Room) => {
  const [form] = Form.useForm();
  const isRC = !noBeds && (!beds || beds.length === 0);
  const editDisabled =
    noBeds &&
    (title === COMPONENTS_TITLES[1] || title === COMPONENTS_TITLES[2]);
  const [visible, setVisible] = useState(false);

  const roomTypeClass = useMemo(() => {
    switch (roomTypeCode) {
      case "B1":
      case "VIP":
        return styles.oneBed;
      case "B2":
        return styles.twoBeds;
      case "B3":
        return styles.threeBeds;
      case "B4":
        return styles.fourBeds;
      case "B5":
        return styles.fiveBeds;
      case "B6":
        return styles.sixBeds;
    }
  }, [roomTypeCode]);

  const menuItems: any = useMemo(() => {
    if (isComponent) {
      return [];
    }

    return editDisabled
      ? [
          {
            label: "Delete",
            key: "Delete",
            danger: true,
          },
        ]
      : [
          { label: "Edit", key: "Edit" },
          { label: "Delete", key: "Delete", danger: true },
        ];
  }, [isComponent, editDisabled]);

  useEffect(() => {
    onHandle(visible);
  }, [visible]);

  return (
    <div
      className={classNames(
        styles.RoomCard,
        noBeds ? styles.noBeds : styles.beds
      )}
    >
      {!isComponent && (
        <Dropdown
          menu={{
            items: menuItems,
            onClick: ({ key }) => {
              if (key === "Edit") {
                setVisible(true);
              }

              if (key === "Delete") {
                onDelete(id as UniqueIdentifier);
                onHandle(false);
              }
            },
          }}
          onOpenChange={onHandle}
        >
          <img className={styles.editIcon} src={edit} alt="edit" />
        </Dropdown>
      )}
      {noBeds ? (
        <span>{title}</span>
      ) : (
        <>
          <div className={styles.header}>{title}</div>
          <div
            className={classNames(
              styles.body,
              isRC ? styles.roomComponent : roomTypeClass
            )}
          >
            {isRC ? (
              new Array(6).fill("").map(() => <div />)
            ) : roomTypeCode === "B5" ? (
              <>
                <div>
                  {beds.slice(0, 3).map((bed) => (
                    <div>{bed.bedNo}</div>
                  ))}
                </div>
                <div>
                  {beds.slice(3).map((bed) => (
                    <div>{bed.bedNo}</div>
                  ))}
                </div>
              </>
            ) : (
              beds.map((bed) => <div>{bed.bedNo}</div>)
            )}
          </div>
        </>
      )}
      <Modal
        centered
        destroyOnClose
        maskClosable={false}
        title="Edit Room"
        open={visible}
        onOk={form.submit}
        okText="Save"
        onCancel={() => {
          Modal.confirm({
            centered: true,
            maskClosable: false,
            title: "Are you sure to leave without saving?",
            okText: "Confirm",
            onOk: () => setVisible(false),
          });
        }}
      >
        <Form
          form={form}
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 12 }}
          initialValues={{
            title,
            roomTypeCode,
          }}
          onFinish={(vs) => {
            onSave(id as UniqueIdentifier, vs);

            setVisible(false);
          }}
        >
          <Form.Item
            label="Room Name"
            name="title"
            rules={[{ required: true, message: "Room Name is required" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="Room Type"
            name="roomTypeCode"
            hidden={noBeds}
            rules={[{ required: !noBeds, message: "Room Type is required" }]}
          >
            <Select
              options={ROOM_DICT.map(({ name, code }) => ({
                label: name,
                value: code,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
