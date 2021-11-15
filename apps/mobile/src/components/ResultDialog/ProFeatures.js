import React from 'react';
import {View} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useTracked} from '../../provider';
import {eSendEvent} from '../../services/EventManager';
import {eCloseResultDialog, eOpenPremiumDialog} from '../../utils/Events';
import {SIZE} from '../../utils/SizeUtils';
import {sleep} from '../../utils/TimeUtils';
import Paragraph from '../Typography/Paragraph';
export const ProFeatures = () => {
  const [state, dispatch] = useTracked();
  const {colors} = state;

  return (
    <>
      {[
        {
          title: 'Unlimited notes & notebooks',
          icon: 'notebook'
        },
        {
          title: 'Unlimited file & image attachments',
          icon: 'attachment'
        },
        {
          title: 'Lock any note with password',
          icon: 'shield-outline'
        },
        {
          title: 'Rich text editing with markdown',
          icon: 'pencil'
        }
      ].map(item => (
        <View
          style={{
            flexDirection: 'row',
            width: '100%',
            height: 40,
            paddingHorizontal: 24,
            marginBottom: 10,
            alignItems: 'center',
            borderRadius: 5
          }}>
          <Icon size={SIZE.md} color={colors.accent} name={item.icon} />
          <Paragraph style={{marginLeft: 5}}>{item.title}</Paragraph>
        </View>
      ))}
      <Paragraph
        onPress={async () => {
          eSendEvent(eCloseResultDialog);
          await sleep(300);
          eSendEvent(eOpenPremiumDialog);
        }}
        size={SIZE.xs + 2}
        style={{
          textDecorationLine: 'underline',
          color: colors.icon
        }}>
        See all features included in Notesnook Pro
      </Paragraph>
    </>
  );
};
