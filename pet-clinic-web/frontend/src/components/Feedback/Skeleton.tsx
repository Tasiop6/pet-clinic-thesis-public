import React from "react";
import "./Skeleton.css";

interface SkeletonProps {
    className?: string;
    variant?: "text" | "rect" | "circle";
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
}

export function Skeleton({
    className = "",
    variant = "rect",
    width,
    height,
    style,
}: SkeletonProps) {
    const styles: React.CSSProperties = {
        width,
        height,
        ...style,
    };

    return (
        <span
            className={`skeleton skeleton-${variant} ${className}`}
            style={styles}
            aria-hidden="true"
        />
    );
}
