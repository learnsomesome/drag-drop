import {
  closestCenter,
  CollisionDetection,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  DropAnimation,
  getFirstCollision,
  MeasuringStrategy,
  pointerWithin,
  rectIntersection,
  UniqueIdentifier,
} from "@dnd-kit/core";
import {
  AnimateLayoutChanges,
  arrayMove,
  defaultAnimateLayoutChanges,
  SortableContext,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useEffect, useRef, useState } from "react";
import { Container, ContainerProps, Item, RoomCard } from "./components";
import { createPortal } from "react-dom";
import { createSnapModifier } from "./utils";
import {
  COMPONENTS_LABELS,
  COMPONENTS_TITLES,
  GRID_SIZE,
  ROOM_DICT,
} from "./constant";

import styles from "./App.module.less";
import { Button, Modal } from "antd";

type Items = Record<UniqueIdentifier, UniqueIdentifier[]>;
type Bed = {
  bedNo: string;
};
export type Room = {
  id?: UniqueIdentifier;
  title: string;
  roomTypeCode: string;
  pedding: boolean;
  x?: number;
  y?: number;
  noBeds?: boolean;
  beds: Bed[];
};
type Rooms = Record<UniqueIdentifier, Room>;

function App() {
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const recentlyMovedToNewContainer = useRef(false);
  const dragDomOriginalOffset = useRef<any>({});
  const [rooms, setRooms] = useState<Rooms>({});
  const [items, setItems] = useState<Items>({
    P: [],
    V: [],
    C: ["Room-1", "Nurse Station-1", "Treatment Room-1", "Customized-1"],
  });
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [clonedItems, setClonedItems] = useState<Items | null>(null);
  const [deviationRepair, setDeviationRepair] = useState(false);
  const [handle, setHandle] = useState(false);
  // const [visible, setVisible] = useState(false);
  const containers = Object.keys(items) as UniqueIdentifier[];

  console.log("handle", handle);
  console.log("Rooms", rooms);

  /**
   * Custom collision detection strategy optimized for multiple containers
   *
   * - First, find any droppable containers intersecting with the pointer.
   * - If there are none, find intersecting containers with the active draggable.
   * - If there are no intersecting containers, return the last matched intersection
   *
   */
  const collisionDetectionStrategy: CollisionDetection = useCallback(
    (args) => {
      if (activeId && activeId in items) {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter(
            (container) => container.id in items
          ),
        });
      }

      // Start by finding any intersecting droppable
      const pointerIntersections = pointerWithin(args);
      const intersections =
        pointerIntersections.length > 0
          ? // If there are droppables intersecting with the pointer, return those
            pointerIntersections
          : rectIntersection(args);
      let overId = getFirstCollision(intersections, "id");

      if (overId !== null) {
        if (overId in items) {
          const containerItems = items[overId];

          // If a container is matched and it contains items (columns 'A', 'B', 'C')
          if (containerItems.length > 0) {
            // Return the closest droppable within that container
            overId = closestCenter({
              ...args,
              droppableContainers: args.droppableContainers.filter(
                (container) =>
                  container.id !== overId &&
                  containerItems.includes(container.id)
              ),
            })[0]?.id;
          }
        }

        lastOverId.current = overId;

        return [{ id: overId }];
      }

      // When a draggable item moves to a new container, the layout may shift
      // and the `overId` may become `null`. We manually set the cached `lastOverId`
      // to the id of the draggable item that was moved to the new container, otherwise
      // the previous `overId` will be returned which can cause items to incorrectly shift positions
      if (recentlyMovedToNewContainer.current) {
        lastOverId.current = activeId;
      }

      // If no droppable is matched, return the last match
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [activeId, items]
  );

  const findContainer = (id: UniqueIdentifier, list = items) => {
    if (id in list) {
      return id;
    }

    return Object.keys(list).find((key) => list[key].includes(id));
  };

  const uniqueComponentId = (id: UniqueIdentifier): UniqueIdentifier => {
    if (Object.values(items).flat().includes(id)) {
      const [name, serialNumber] = (id as string).split("-");

      return uniqueComponentId(`${name}-${+serialNumber + 1}`);
    }

    return id;
  };

  const getPositionCoordinates = ({
    originalActiveContainer,
    delta: { x, y },
  }: any) => {
    const dropDomList: any = document.querySelectorAll(".operateArea");
    const { left: originLeft, top: originTop } = dragDomOriginalOffset.current;

    switch (originalActiveContainer) {
      case "P":
        return {
          x: x - (dropDomList[0].offsetWidth + 1 - originLeft),
          y: originTop + y,
        };
      case "V":
        return {
          x: originLeft + x,
          y: originTop + y,
        };
      default:
        return {
          x: dropDomList[1].offsetWidth + x + originLeft + 30,
          y: originTop + y,
        };
    }
  };

  const checkCoordinatesCollision = (
    c1: { x: number; y: number },
    c2: { x: number; y: number }
  ) => {
    const { x: x1, y: y1 } = c1;
    const { x: x2, y: y2 } = c2;

    const minX = Math.max(x1, x2);
    const minY = Math.max(y1, y2);
    const maxX = Math.min(x1 + GRID_SIZE * 6, x2 + GRID_SIZE * 6);
    const maxY = Math.min(y1 + GRID_SIZE * 3, y2 + GRID_SIZE * 3);

    return minX < maxX && minY < maxY;
  };

  const checkBoundaryPosition = (x: number, y: number) => {
    // no over area
    if ((!x && x !== 0) || (!y && y !== 0)) return false;

    // outside area
    const dropDom: any = document.querySelectorAll(".operateArea")[1];
    let maxX = dropDom.offsetWidth - GRID_SIZE * 6;
    let maxY = dropDom.offsetHeight - GRID_SIZE * 3 - 30;

    while (maxX % 20 !== 0) {
      maxX--;
    }

    while (maxY % 20 !== 0) {
      maxY--;
    }

    if (x < 0 || y < 0 || x > maxX || y > maxY) return false;

    // collision
    return (
      (clonedItems as Items)["V"].length === 0 ||
      !(clonedItems as Items)["V"].some(
        (id) =>
          id !== activeId &&
          checkCoordinatesCollision(
            { x, y },
            rooms[id] as { x: number; y: number }
          )
      )
    );
  };

  const isDropDisabled = (
    originalActiveContainer: UniqueIdentifier,
    overContainer: UniqueIdentifier
  ) => {
    return (
      (originalActiveContainer === "C" && overContainer === "P") ||
      overContainer === "C"
    );
  };

  const isHiddenOriginDrag = (id: UniqueIdentifier) => {
    if (id !== activeId) return false;

    const originActiveContainer = findContainer(id, clonedItems as Items);
    const overContainer = findContainer(id);

    return originActiveContainer !== "V" && overContainer === "V";
  };

  const onDragCancel = () => {
    if (clonedItems) {
      // Reset items to their original state in case items have been
      // Dragged across containers
      setItems(clonedItems);
    }

    setActiveId(null);
    setClonedItems(null);
  };

  const onDelete = (id: UniqueIdentifier) => {
    const containerId = findContainer(id);

    setItems((items) => ({
      ...items,
      [containerId as UniqueIdentifier]: items[
        containerId as UniqueIdentifier
      ].filter((item) => item !== id),
    }));

    setRooms((rooms) => {
      delete rooms[id];

      return rooms;
    });
  };

  const onSave = (id: UniqueIdentifier, vs: any) => {
    setRooms((rooms) => ({
      ...rooms,
      [id]: {
        ...rooms[id],
        ...vs,
        beds: vs.roomTypeCode
          ? new Array(
              ROOM_DICT.find(({ code }) => code === vs.roomTypeCode)?.quantity
            )
              .fill("")
              .map((item, index) => ({
                bedNo: index + 1,
              }))
          : null,
      },
    }));
  };

  const renderContainerProps = (containerId: UniqueIdentifier) => {
    switch (containerId) {
      case "P":
        return {
          label: "Pending Locations",
          columns: 2,
          scrollable: true,
          style: {
            width: 300,
            minWidth: 300,
            marginRight: 0,
            borderRight: 0,
          },
        };
      case "V":
        return {
          label: "Virtual Floor Plan",
          snapToGrid: GRID_SIZE,
          style: {
            flex: 1,
            minWidth: 400,
            marginLeft: 0,
            marginRight: 0,
          },
        };
      default:
        return {
          label: "Components",
          scrollable: true,
          style: {
            width: 280,
            minWidth: 280,
          },
        };
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      recentlyMovedToNewContainer.current = false;
    });
  }, [items]);

  return (
    <div className={styles.app}>
      <DndContext
        collisionDetection={collisionDetectionStrategy}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        modifiers={[createSnapModifier(GRID_SIZE, deviationRepair)]}
        onDragStart={({ active }) => {
          console.log("onDragStart", active);
          const dragDom: any = document.querySelector(
            `[data-id='${active.id}']`
          );
          dragDomOriginalOffset.current = {
            left: dragDom?.offsetLeft,
            top: dragDom?.offsetTop,
          };

          setActiveId(active.id);
          setClonedItems(items);
          setDeviationRepair(false);
        }}
        onDragOver={({ active, over }) => {
          console.log("onDragOver", active, over);
          const overId = over?.id;

          if (overId == null || active.id in items) {
            return;
          }

          const overContainer = findContainer(overId);
          const activeContainer = findContainer(active.id);

          if (!overContainer || !activeContainer) {
            return;
          }

          const originalActiveContainer = findContainer(
            active.id,
            clonedItems as Items
          );

          setDeviationRepair(originalActiveContainer === "C");

          if (activeContainer !== overContainer) {
            if (
              isDropDisabled(
                originalActiveContainer as UniqueIdentifier,
                overContainer
              )
            ) {
              return;
            }

            setItems((items) => {
              const activeItems = items[activeContainer];
              const overItems = items[overContainer];
              const overIndex = overItems.indexOf(overId);
              const activeIndex = activeItems.indexOf(active.id);

              let newIndex: number;

              if (overId in items) {
                newIndex = overItems.length + 1;
              } else {
                const isBelowOverItem =
                  over &&
                  active.rect.current.translated &&
                  active.rect.current.translated.top >
                    over.rect.top + over.rect.height;

                const modifier = isBelowOverItem ? 1 : 0;

                newIndex =
                  overIndex >= 0 ? overIndex + modifier : overItems.length + 1;
              }

              recentlyMovedToNewContainer.current = true;

              return {
                ...items,
                [activeContainer]:
                  activeContainer === "C"
                    ? items[activeContainer].map((item) =>
                        item === active.id ? uniqueComponentId(item) : item
                      )
                    : items[activeContainer].filter(
                        (item) => item !== active.id
                      ),
                [overContainer]: [
                  ...items[overContainer].slice(0, newIndex),
                  items[activeContainer][activeIndex],
                  ...items[overContainer].slice(
                    newIndex,
                    items[overContainer].length
                  ),
                ],
              };
            });
          }
        }}
        onDragEnd={({ active, over, delta }) => {
          console.log("onDragEnd", active, over, delta);

          const activeContainer = findContainer(active.id);

          if (!activeContainer) {
            setActiveId(null);
            return;
          }

          if (!over) {
            onDragCancel();
            return;
          }

          const overId = over.id;
          const overContainer = findContainer(overId);

          if (overContainer) {
            const originalActiveContainer = findContainer(
              active.id,
              clonedItems as Items
            );

            if (
              isDropDisabled(
                originalActiveContainer as UniqueIdentifier,
                overContainer
              )
            ) {
              onDragCancel();
              return;
            }

            // sync rooms
            if (overContainer === "V") {
              const { x, y } = getPositionCoordinates({
                originalActiveContainer,
                delta,
              });

              const isValid = checkBoundaryPosition(x, y);

              if (!isValid) {
                onDragCancel();
                return;
              }

              setRooms((items) => {
                const item = items[activeId as UniqueIdentifier];
                const isRC = (activeId as string).split("-")[0] === "Room";

                return {
                  ...items,
                  [activeId as UniqueIdentifier]: {
                    ...(item ?? {}),
                    x,
                    y,
                    pedding: false,
                    title: item?.title ?? (activeId as string).split("-")[0],
                    id: item?.id ?? activeId,
                    roomTypeCode: item?.roomTypeCode ?? isRC ? "B6" : null,
                    noBeds: item?.noBeds ?? !isRC,
                    beds: (item?.beds ?? isRC
                      ? new Array(6).fill("").map((item, index) => ({
                          bedNo: index + 1,
                        }))
                      : null) as any[],
                  } as Room,
                };
              });
            }

            if (overContainer === "P") {
              setRooms((items) => {
                const item = items[activeId as UniqueIdentifier];

                delete item.x;
                delete item.y;

                return {
                  ...items,
                  [activeId as UniqueIdentifier]: {
                    ...(item ?? {}),
                    pedding: true,
                  } as Room,
                };
              });
            }

            const activeIndex = items[activeContainer].indexOf(active.id);
            const overIndex = items[overContainer].indexOf(overId);

            if (activeIndex !== overIndex) {
              setItems((items) => ({
                ...items,
                [overContainer]: arrayMove(
                  items[overContainer],
                  activeIndex,
                  overIndex
                ),
              }));
            }
          }

          setActiveId(null);
        }}
        onDragCancel={onDragCancel}
      >
        <div
          style={{
            display: "flex",
            justifyItems: "space-between",
            height: "100%",
            width: "100%",
          }}
        >
          {containers.map((containerId) => (
            <DroppableContainer
              key={containerId}
              id={containerId}
              items={items[containerId]}
              {...renderContainerProps(containerId)}
            >
              <SortableContext
                items={containerId === "P" ? items[containerId] : []}
              >
                {items[containerId].map((value, index) => {
                  const isComponent = containerId === "C";
                  const room = rooms[value] ?? {
                    title: COMPONENTS_TITLES[index],
                    noBeds: index !== 0,
                  };

                  return (
                    <div key={value}>
                      {isComponent && (
                        <p
                          style={{
                            height: "20px",
                            margin: "10px 0",
                            fontSize: "14px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {COMPONENTS_LABELS[index]}
                        </p>
                      )}
                      <SortableItem
                        handle={handle}
                        hiddenOriginDrag={isHiddenOriginDrag(value)}
                        key={value}
                        id={value}
                        index={index}
                        style={() => ({})}
                        wrapperStyle={() =>
                          containerId === "V"
                            ? {
                                position: "absolute",
                                top: rooms[value]?.y,
                                left: rooms[value]?.x,
                              }
                            : {}
                        }
                        containerId={containerId}
                      >
                        <RoomCard
                          isComponent={isComponent}
                          onHandle={setHandle}
                          onDelete={onDelete}
                          onSave={onSave}
                          {...room}
                        />
                      </SortableItem>
                    </div>
                  );
                })}
              </SortableContext>
            </DroppableContainer>
          ))}
        </div>
        {createPortal(
          <DragOverlay dropAnimation={dropAnimation}>
            {activeId ? renderSortableItemDragOverlay(activeId) : null}
          </DragOverlay>,
          document.body
        )}
      </DndContext>
      {/* {visible && (
        <Modal
          className="PreviewModal"
          width={
            (document.querySelectorAll(".operateArea")[1] as any).offsetWidth
          }
          style={
            {
              "--height": `${
                (document.querySelectorAll(".operateArea")[1] as any)
                  .offsetHeight
              }px`,
            } as React.CSSProperties
          }
          centered
          maskClosable={false}
          title="Preview"
          open={visible}
          onCancel={() => setVisible(false)}
        >
          {items["V"].map((id) => {
            return (
              <Item
                value={id}
                wrapperStyle={{
                  position: "absolute",
                  top: rooms[id]?.y ?? 0,
                  left: rooms[id]?.x ?? 0,
                }}
                handle={true}
              >
                <RoomCard isComponent={true} {...rooms[id]} />
              </Item>
            );
          })}
        </Modal>
      )} */}
    </div>
  );

  function renderSortableItemDragOverlay(id: UniqueIdentifier) {
    const originActiveContainer = findContainer(id, clonedItems as Items);
    const activeIndex = (clonedItems as Items)[
      originActiveContainer as UniqueIdentifier
    ].indexOf(id);
    const isComponent = originActiveContainer === "C";

    const room = rooms[id] ?? {
      title: COMPONENTS_TITLES[activeIndex],
      noBeds: activeIndex !== 0,
    };

    return (
      <Item value={id} dragOverlay>
        <RoomCard isComponent={isComponent} {...room} />
      </Item>
    );
  }
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

function DroppableContainer({
  children,
  columns = 1,
  disabled,
  id,
  items,
  style,
  ...props
}: ContainerProps & {
  disabled?: boolean;
  id: UniqueIdentifier;
  items: UniqueIdentifier[];
  style?: React.CSSProperties;
}) {
  const {
    active,
    attributes,
    isDragging,
    listeners,
    over,
    setNodeRef,
    transition,
    transform,
  } = useSortable({
    id,
    data: {
      type: "container",
      children: items,
    },
    animateLayoutChanges,
  });
  const isOverContainer = over
    ? (id === over.id && active?.data.current?.type !== "container") ||
      items.includes(over.id)
    : false;

  return (
    <Container
      ref={disabled ? undefined : setNodeRef}
      style={{
        ...style,
        transition,
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : undefined,
      }}
      hover={isOverContainer}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      columns={columns}
      {...props}
    >
      {children}
    </Container>
  );
}

interface SortableItemProps {
  containerId: UniqueIdentifier;
  handle?: boolean;
  id: UniqueIdentifier;
  index: number;
  disabled?: boolean;
  hiddenOriginDrag?: boolean;
  style(args: any): React.CSSProperties;
  wrapperStyle({ index }: { index: number }): React.CSSProperties;
  children?: React.ReactNode;
}

function SortableItem({
  disabled,
  handle = false,
  hiddenOriginDrag,
  id,
  index,
  style,
  containerId,
  wrapperStyle,
  children = null,
}: SortableItemProps) {
  const {
    setNodeRef,
    listeners,
    isDragging,
    isSorting,
    transform,
    transition,
  } = useSortable({
    id,
  });
  const mounted = useMountStatus();
  const mountedWhileDragging = isDragging && !mounted;

  return (
    <Item
      ref={disabled ? undefined : setNodeRef}
      value={id}
      dragging={isDragging}
      sorting={isSorting}
      hiddenOriginDrag={hiddenOriginDrag}
      index={index}
      wrapperStyle={wrapperStyle({ index })}
      style={style({
        index,
        value: id,
        isDragging,
        isSorting,
        containerId,
      })}
      transition={transition}
      transform={transform}
      fadeIn={mountedWhileDragging}
      listeners={listeners}
      handle={handle}
    >
      {children}
    </Item>
  );
}

function useMountStatus() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsMounted(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return isMounted;
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: "0.5",
      },
    },
  }),
};

export default App;
