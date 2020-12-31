import React, {createRef} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {FlatList, TextInput} from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {notesnook} from '../../../e2e/test.ids';
import {Actions} from '../../provider/Actions';
import {DDS} from '../../services/DeviceDetection';
import {eSendEvent, ToastEvent} from '../../services/EventManager';
import {db} from '../../utils/DB';
import {eShowGetPremium} from '../../utils/Events';
import {ph, pv, SIZE, WEIGHT} from '../../utils/SizeUtils';
import {ActionIcon} from '../ActionIcon';
import {GetPremium} from '../ActionSheetComponent/GetPremium';
import DialogButtons from '../Dialog/dialog-buttons';
import DialogHeader from '../Dialog/dialog-header';
import {updateEvent} from '../DialogManager/recievers';
import Input from '../Input';
import {Toast} from '../Toast';
import Paragraph from '../Typography/Paragraph';

let refs = [];

export class AddNotebookDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      visible: false,
      topics: [],
      description: null,
      titleFocused: false,
      descFocused: false,
      count: 0,
      topicInputFocused: false,
      editTopic: false,
    };
    this.title = null;
    this.description = null;
    this.listRef;
    this.prevItem = null;
    this.prevIndex = null;
    this.currentSelectedInput = null;
    this.id = null;
    this.backPressCount = 0;
    this.currentInputValue = null;
    this.titleRef;
    this.descriptionRef;
    this.topicsToDelete = [];
    this.hiddenInput = createRef();
    this.topicInputRef = createRef();
    this.addingTopic = false;
  }

  open = () => {
    refs = [];
    let {toEdit} = this.props;

    if (toEdit && toEdit.type === 'notebook') {
      let topicsList = [];
      toEdit.topics.forEach((item, index) => {
        if (index === 0) return;
        topicsList.push(item.title);
      });
      this.id = toEdit.id;
      this.title = toEdit.title;
      this.description = toEdit.description;

      this.setState({
        topics: [...topicsList],

        visible: true,
      });
    } else {
      this.setState({
        visible: true,
      });
    }
  };

  close = () => {
    refs = [];
    this.prevIndex = null;
    this.prevItem = null;
    this.currentSelectedInput = null;
    this.title = null;
    this.description = null;
    this.currentInputValue = null;
    this.id = null;
    this.setState({
      visible: false,
      topics: [],
      descFocused: false,
      titleFocused: false,
      editTopic: false,
    });
  };

  onDelete = (index) => {
    let {topics} = this.state;
    let prevTopics = topics;
    refs = [];
    prevTopics.splice(index, 1);
    let edit = this.props.toEdit;
    if (edit && edit.id) {
      let topicToDelete = edit.topics[index + 1];

      if (topicToDelete) {
        this.topicsToDelete.push(topicToDelete.id);
      }
    }
    let nextTopics = [...prevTopics];
    if (this.prevIndex === index) {
      this.prevIndex = null;
      this.prevItem = null;
      this.currentInputValue = null;
      this.topicInputRef.current?.setNativeProps({
        text: null,
      });
    }
    this.setState({
      topics: nextTopics,
    });
  };

  addNewNotebook = async () => {
    let {topics} = this.state;
    let edit = this.props.toEdit;

    if (!this.title || this.title?.trim().length === 0)
      return ToastEvent.show('Notebook title is required', 'error', 'local');

    let id = edit && edit.id ? edit.id : null;

    let toEdit;
    if (id) {
      toEdit = db.notebooks.notebook(edit.id).data;
    }

    let prevTopics = [...topics];

    if (this.currentInputValue && this.currentInputValue.trim().length !== 0) {
      if (this.prevItem != null) {
        prevTopics[this.prevIndex] = this.currentInputValue;
      } else {
        prevTopics.push(this.currentInputValue);
        this.currentInputValue = null;
      }
    }
    if (id) {
      if (this.topicsToDelete?.length > 0) {
        await db.notebooks
          .notebook(toEdit.id)
          .topics.delete(...this.topicsToDelete);
        toEdit = db.notebooks.notebook(toEdit.id).data;
      }

      await db.notebooks.add({
        title: this.title,
        description: this.description,
        id: id,
      });

      let nextTopics = toEdit.topics.map((topic, index) => {
        if (index === 0) return topic;
        let copy = {...topic};
        copy.title = prevTopics[index - 1];
        return copy;
      });

      prevTopics.forEach((title, index) => {
        if (!nextTopics[index + 1]) {
          nextTopics.push(title);
        }
      });

      await db.notebooks.notebook(id).topics.add(...nextTopics);
    } else {
      await db.notebooks.add({
        title: this.title,
        description: this.description,
        topics: prevTopics,
        id: id,
      });
    }
    this.close();
    updateEvent({type: Actions.NOTEBOOKS});
    updateEvent({type: Actions.PINNED});
  };

  onSubmit = (forward = true) => {
    this.hiddenInput.current?.focus();
    let {topics} = this.state;
    if (!this.currentInputValue || this.currentInputValue?.trim().length === 0)
      return;

    let prevTopics = [...topics];
    if (this.prevItem === null) {
      prevTopics.push(this.currentInputValue);
      this.setState({
        topics: prevTopics,
      });
      setTimeout(() => {
        this.listRef.scrollToEnd({animated: true});
      }, 30);
      this.currentInputValue = null;
    } else {
      prevTopics[this.prevIndex] = this.currentInputValue;
      this.setState({
        topics: prevTopics,
      });
      this.currentInputValue = null;
      console.log('edit topic is', this.state.editTopic);
      if (this.state.editTopic) {
        this.topicInputRef.current?.blur();
        Keyboard.dismiss();
        this.setState({
          editTopic: false,
        });
      }
      this.prevItem = null;
      this.prevIndex = null;
      this.currentInputValue = null;

      if (forward) {
        setTimeout(() => {
          this.listRef.scrollToEnd({animated: true});
        }, 30);
      }
    }

    this.topicInputRef.current?.focus();
  };

  render() {
    const {colors, toEdit} = this.props;
    const {
      titleFocused,
      descFocused,
      topics,
      visible,
      topicInputFocused,
    } = this.state;
    if (!visible) return null;
    return (
      <Modal
        visible={true}
        transparent={true}
        animated
        animationType={DDS.isTab ? 'fade' : 'slide'}
        onShow={() => {
          this.topicsToDelete = [];
          this.titleRef?.focus();
        }}
        onRequestClose={this.close}>
        <SafeAreaView>
          <TextInput
            ref={this.hiddenInput}
            style={{
              width: 1,
              height: 1,
              opacity: 0,
              position: 'absolute',
            }}
            blurOnSubmit={false}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : null}
            style={styles.wrapper}>
            <TouchableOpacity onPress={this.close} style={styles.overlay} />
            <View
              style={[
                styles.container,
                {
                  backgroundColor: colors.bg,
                },
              ]}>
              <DialogHeader
                title={
                  toEdit && toEdit.dateCreated
                    ? 'Edit Notebook'
                    : 'New Notebook'
                }
                paragraph={
                  toEdit && toEdit.dateCreated
                    ? 'Edit your notebook'
                    : 'Add a new notebook'
                }
              />

              <Input
                fwdRef={(ref) => (this.titleRef = ref)}
                testID={notesnook.ids.dialogs.notebook.inputs.title}
                onChangeText={(value) => {
                  this.title = value;
                }}
                placeholder="Enter a Title"
                onSubmit={() => {
                  this.descriptionRef.focus();
                }}
                defaultValue={toEdit ? toEdit.title : null}
              />

              <Input
                fwdRef={(ref) => (this.descriptionRef = ref)}
                testID={notesnook.ids.dialogs.notebook.inputs.description}
                onChangeText={(value) => {
                  this.description = value;
                }}
                placeholder="Describe your notebook."
                onSubmit={() => {
                  this.topicInputRef.current?.focus();
                }}
                defaultValue={toEdit ? toEdit.description : null}
              />

              <Input
                fwdRef={this.topicInputRef}
                testID={notesnook.ids.dialogs.notebook.inputs.topic}
                clearTextOnFocus={true}
                onChangeText={(value) => {
                  this.currentInputValue = value;
                  if (this.prevItem !== null) {
                    refs[this.prevIndex].setNativeProps({
                      text: value,
                      style: {
                        borderBottomColor: colors.accent,
                      },
                    });
                  }
                }}
                onSubmit={() => {
                  this.onSubmit();
                }}
                blurOnSubmit={false}
                button={{
                  icon: this.state.editTopic ? 'check' : 'plus',
                  onPress: this.onSubmit,
                  color: topicInputFocused ? colors.accent : colors.icon,
                }}
                placeholder="Add a topic"
              />

              <FlatList
                data={topics}
                ref={(ref) => (this.listRef = ref)}
                keyExtractor={(item, index) => item + index.toString()}
                renderItem={({item, index}) => (
                  <TopicItem
                    item={item}
                    onPress={(item, index) => {
                      this.prevIndex = index;
                      this.prevItem = item;
                      this.topicInputRef.current?.setNativeProps({
                        text: item,
                      });
                      this.topicInputRef.current?.focus();
                      this.currentInputValue = item;
                      this.setState({
                        editTopic: true,
                      });
                    }}
                    onDelete={this.onDelete}
                    index={index}
                    colors={colors}
                  />
                )}
              />

              <DialogButtons
                negativeTitle="Cancel"
                positiveTitle={toEdit && toEdit.dateCreated ? 'Save' : 'Add'}
                onPressPositive={this.addNewNotebook}
                onPressNegative={this.close}
              />
            </View>
          </KeyboardAvoidingView>
          <Toast context="local" />
        </SafeAreaView>
      </Modal>
    );
  }
}

const TopicItem = ({item, index, colors, onPress, onDelete}) => {
  const topicRef = (ref) => (refs[index] = ref);

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderColor: colors.nav,
      }}>
      <TouchableOpacity
        style={{
          width: '80%',
          backgroundColor: 'transparent',
          zIndex: 10,
          position: 'absolute',
          height: 30,
        }}
        onPress={() => {
          onPress(item, index);
        }}
      />
      <Paragraph
        style={{
          marginRight: index === 0 ? 2 : 0,
        }}>
        {index + 1 + '.'}
      </Paragraph>
      <TextInput
        ref={topicRef}
        editable={false}
        style={[
          styles.topicInput,
          {
            color: colors.pri,
          },
        ]}
        defaultValue={item}
        placeholderTextColor={colors.icon}
      />

      <View
        style={{
          width: 80,
          position: 'absolute',
          right: 0,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'flex-end',
        }}>
        <ActionIcon
          onPress={() => {
            onPress(item, index);
          }}
          name="pencil"
          size={SIZE.lg - 5}
          color={colors.icon}
        />
        <ActionIcon
          onPress={() => {
            onDelete(index);
          }}
          name="minus"
          size={SIZE.lg}
          color={colors.icon}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: DDS.isTab ? 500 : '100%',
    height: DDS.isTab ? 600 : '100%',
    maxHeight: DDS.isTab ? 600 : '100%',
    borderRadius: DDS.isTab ? 5 : 0,
    paddingHorizontal: 12,
    paddingVertical: pv,
  },
  overlay: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  headingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headingText: {
    fontFamily: WEIGHT.bold,
    marginLeft: 5,
    fontSize: SIZE.xl,
  },
  input: {
    paddingRight: 12,
    paddingHorizontal: 0,
    borderRadius: 0,
    minHeight: 45,
    fontSize: SIZE.md,
    fontFamily: WEIGHT.regular,
    padding: pv - 2,
    borderBottomWidth: 1,
    marginTop: 10,
    marginBottom: 5,
  },
  addBtn: {
    width: '12%',
    minHeight: 45,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
  },
  buttonContainer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    flexDirection: 'row',
    width: '100%',
    marginTop: 20,
  },

  topicContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  topicInput: {
    padding: pv - 5,
    fontSize: SIZE.sm,
    fontFamily: WEIGHT.regular,
    paddingHorizontal: ph,
    paddingRight: 40,
    paddingVertical: 10,
    width: '100%',
    maxWidth: '100%',
  },
  topicBtn: {
    borderRadius: 5,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    right: 0,
  },
});
