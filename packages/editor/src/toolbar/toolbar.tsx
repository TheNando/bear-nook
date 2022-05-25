import { Theme, useTheme } from "@notesnook/theme";
import { ThemeConfig } from "@notesnook/theme/dist/theme/types";
import { Editor } from "@tiptap/core";
import { Flex, FlexProps } from "rebass";
import { findToolById, ToolId } from "./tools";
import { ThemeProvider } from "emotion-theming";
import { EditorFloatingMenus } from "./floating-menus";
import { getToolDefinition } from "./tool-definitions";
import { Dropdown } from "./components/dropdown";
import { ToolButton } from "./components/tool-button";
import { useContext, useEffect, useRef, useState } from "react";
import { MenuPresenter } from "../components/menu";
import { Popup } from "./components/popup";
import { ToolbarContext, useToolbarContext } from "./hooks/useToolbarContext";
import {
  ToolbarLocation,
  useToolbarLocation,
  useToolbarStore,
} from "./stores/toolbar-store";

// type Colors = {
//   text: string;
//   background: string;
//   bgSecondary: string;
//   primary: string;
//   hover: string;
//   border: string;
// };

type ToolbarGroupDefinition = (ToolId | ToolId[])[];
type ToolbarDefinition = ToolbarGroupDefinition[];

type ToolbarProps = {
  theme: Theme;
  editor: Editor | null;
  location: ToolbarLocation;
  isMobile?: boolean;
};
export function Toolbar(props: ToolbarProps) {
  const { editor, theme, location, isMobile } = props;
  const [currentPopup, setCurrentPopup] = useState<string | undefined>();
  const { setIsMobile, setToolbarLocation } = useToolbarStore();

  useEffect(() => {
    setIsMobile(isMobile || false);
    setToolbarLocation(location);
  }, [isMobile, location]);

  const tools: ToolbarDefinition = [
    ["insertBlock"],
    [
      "bold",
      "italic",
      "underline",
      [
        "strikethrough",
        "code",
        "subscript",
        "superscript",
        "highlight",
        "textColor",
      ],
    ],
    ["fontSize"],
    ["headings", "fontFamily"],
    ["numberedList", "bulletList"],
    ["link"],
    ["alignCenter", ["alignLeft", "alignRight", "alignJustify", "ltr", "rtl"]],
    ["clearformatting"],
  ];

  if (!editor) return null;
  return (
    <ThemeProvider theme={theme}>
      <ToolbarContext.Provider
        value={{
          setCurrentPopup,
          currentPopup,
        }}
      >
        <Flex
          className="editor-toolbar"
          sx={{ flexWrap: ["nowrap", "wrap"], overflowX: ["auto", "hidden"] }}
        >
          {tools.map((tools) => {
            return (
              <ToolbarGroup
                tools={tools}
                editor={editor}
                sx={{
                  flexShrink: 0,
                  pr: 2,
                  mr: 2,
                  borderRight: "1px solid var(--border)",
                  ":last-of-type": { mr: 0, pr: 0, borderRight: "none" },
                }}
              />
            );
          })}
        </Flex>
      </ToolbarContext.Provider>
      <EditorFloatingMenus editor={editor} />
    </ThemeProvider>
  );
}

type ToolbarGroupProps = FlexProps & {
  tools: ToolbarGroupDefinition;
  editor: Editor;
};
function ToolbarGroup(props: ToolbarGroupProps) {
  const { tools, editor, ...flexProps } = props;

  return (
    <Flex className="toolbar-group" {...flexProps}>
      {tools.map((toolId) => {
        if (Array.isArray(toolId)) {
          return (
            <MoreTools
              popupId={toolId.join("")}
              tools={toolId}
              editor={editor}
            />
          );
        } else {
          const Component = findToolById(toolId);
          const toolDefinition = getToolDefinition(toolId);
          return <Component editor={editor} {...toolDefinition} />;
        }
      })}
    </Flex>
  );
}

type MoreToolsProps = {
  popupId: string;
  tools: ToolId[];
  editor: Editor;
};
function MoreTools(props: MoreToolsProps) {
  const { popupId } = props;
  const { currentPopup, setCurrentPopup } = useToolbarContext();
  const toolbarLocation = useToolbarLocation();

  const buttonRef = useRef<HTMLButtonElement | null>();

  const show = popupId === currentPopup;
  const setShow = (state: boolean) =>
    setCurrentPopup?.(state ? popupId : undefined);

  return (
    <>
      <ToolButton
        icon="more"
        title="More"
        toggled={show}
        buttonRef={buttonRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setShow(!show)}
      />
      <MenuPresenter
        isOpen={show}
        onClose={() => setShow(false)}
        items={[]}
        options={{
          type: "autocomplete",
          position: {
            isTargetAbsolute: true,
            target: buttonRef.current || "mouse",
            align: "center",
            location: toolbarLocation === "bottom" ? "top" : "below",
            yOffset: 5,
          },
        }}
      >
        <Popup>
          <ToolbarGroup
            tools={props.tools}
            editor={props.editor}
            sx={{
              p: 1,
            }}
          />
        </Popup>
      </MenuPresenter>
    </>
  );
}
