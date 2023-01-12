import React, { forwardRef } from "react";
import classNames from "classnames";

import styles from "./Container.module.less";
import { Grid } from "../Grid";

export interface Props {
  children: React.ReactNode;
  columns?: number;
  label?: React.ReactNode;
  style?: React.CSSProperties;
  horizontal?: boolean;
  hover?: boolean;
  handleProps?: React.HTMLAttributes<any>;
  scrollable?: boolean;
  snapToGrid?: number;
  shadow?: boolean;
  placeholder?: boolean;
  unstyled?: boolean;
  onClick?(): void;
  onRemove?(): void;
}

export const Container = forwardRef<HTMLDivElement, Props>(
  (
    {
      children,
      columns = 1,
      handleProps,
      horizontal,
      hover,
      onClick,
      onRemove,
      label,
      placeholder,
      style,
      scrollable,
      shadow,
      unstyled,
      snapToGrid,
      ...props
    }: Props,
    ref
  ) => {
    return (
      <div
        {...props}
        ref={ref}
        style={
          {
            ...style,
            "--columns": columns,
          } as React.CSSProperties
        }
        className={classNames(
          styles.Container,
          !snapToGrid && styles.grid,
          unstyled && styles.unstyled,
          horizontal && styles.horizontal,
          hover && styles.hover,
          placeholder && styles.placeholder,
          scrollable && styles.scrollable,
          shadow && styles.shadow
        )}
        onClick={onClick}
        tabIndex={onClick ? 0 : undefined}
      >
        {label ? <div className={styles.Header}>{label}</div> : null}
        <div
          className="operateArea"
          style={{ position: "relative", height: "100%" }}
        >
          {placeholder ? children : <ul>{children}</ul>}
          {snapToGrid && <Grid size={snapToGrid} />}
        </div>
      </div>
    );
  }
);
